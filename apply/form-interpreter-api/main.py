import os
import json
import re
from pathlib import Path

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from dotenv import load_dotenv
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel
from google.cloud import translate_v3 as translate
from google.cloud import dlp_v2
from google.cloud import documentai_v1 as documentai

# ===========================================================
#  Konfiguraatio
# ===========================================================
BASE_DIR = Path(__file__).resolve().parent
# Lataa .env projektikansiosta tai yhden tason ylempää
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("LOCATION", "europe-north1")
DOCAI_PROCESSOR_ID = os.getenv("DOCAI_PROCESSOR_ID")
GAC_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
GEMINI_MODEL = (
    os.getenv("VERTEX_MODEL")
    or os.getenv("GEMINI_MODEL")
    or "gemini-2.5-flash"
)

app = FastAPI(title="Form Interpreter 2.0 API", version="1.0.0")


@app.get("/")
async def index():
    return FileResponse("index.html")


# favicon – laita favicon.ico samaan kansioon main.py:n kanssa
@app.get("/favicon.ico")
async def favicon():
    return FileResponse("favicon.ico")


# staattiset assetit (js, css, kuvat)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")


@app.get("/healthz")
def health():
    return {"status": "ok"}


# ===========================================================
#  Helper: PII Masking
# ===========================================================
def mask_pii_local(text: str) -> str:
    if not text: return ""
    text = re.sub(r"\b\d{}[-+A]\d{}[0-9A-FHJ-NPR-Y]\b", "******-****", text)
    text = re.sub(r"\bFI[0-9 ]{14,}\b", "FI** **** **** **** **", text)
    return text

# ===========================================================
#  Clients
# ===========================================================
def get_translate_client():
    return translate.TranslationServiceClient()

def get_dlp_client():
    return dlp_v2.DlpServiceClient()

def get_docai_client():
    opts = {"api_endpoint": f"eu-documentai.googleapis.com"}
    return documentai.DocumentProcessorServiceClient(client_options=opts)

# ===========================================================
#  Services
# ===========================================================
def translate_text(text: str, source_lang: str | None, target_lang: str):
    if not text: return text
    try:
        client = get_translate_client()
        parent = f"projects/{PROJECT_ID}/locations/global"
        req = {
            "parent": parent,
            "contents": [text],
            "target_language_code": target_lang,
        }
        if source_lang: req["source_language_code"] = source_lang
        resp = client.translate_text(**req)
        return resp.translations[0].translated_text
    except Exception as e:
        print(f"Translation failed: {e}")
        return text

def redact_pdf_with_dlp(pdf_bytes: bytes) -> bytes:
    if not PROJECT_ID: return pdf_bytes
    client = get_dlp_client()
    parent = f"projects/{PROJECT_ID}/locations/global"
    info_types = [{"name": "FINNISH_NATIONAL_ID"}, {"name": "IBAN_CODE"}, {"name": "EMAIL_ADDRESS"}, {"name": "PHONE_NUMBER"}, {"name": "PERSON_NAME"}]
    inspect_config = {"info_types": info_types, "include_quote": False}
    primitive_transformation = {"replace_with_info_type_config": {}}
    deidentify_config = {"info_type_transformations": {"transformations": [{"primitive_transformation": primitive_transformation}]}}
    item = {"byte_item": {"data": pdf_bytes, "type_": dlp_v2.ByteContentItem.BytesType.PDF}}
    try:
        response = client.deidentify_content(request={"parent": parent, "inspect_config": inspect_config, "deidentify_config": deidentify_config, "item": item})
        return response.item.byte_item.data
    except Exception as e:
        print(f"DLP Redaction failed: {e}")
        return pdf_bytes

def process_pdf_with_docai(pdf_bytes: bytes) -> dict:
    if not DOCAI_PROCESSOR_ID: raise RuntimeError("DOCAI_PROCESSOR_ID missing")
    client = get_docai_client()
    name = client.processor_path(PROJECT_ID, "eu", DOCAI_PROCESSOR_ID)
    raw_document = documentai.RawDocument(content=pdf_bytes, mime_type="application/pdf")
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    result = client.process_document(request=request)
    return documentai.Document.to_dict(result.document)

def fallback_pdf_summary(pdf_bytes: bytes) -> dict:
    """
    Lightweight fallback so frontend can be tested without DocAI.
    Counts pages heuristically from raw PDF bytes.
    """
    try:
        # Count /Page markers; ensure at least 1
        page_markers = re.findall(rb"/Type\s*/Page\b", pdf_bytes)
        page_count = max(1, len(page_markers))
    except Exception as e:
        print(f"Local page count failed: {e}")
        page_count = 1
    return {"pages": [{} for _ in range(page_count)], "text": "DocAI disabled (fallback)"}

# ===========================================================
#  Gemini Logic
# ===========================================================
GEMINI_SYSTEM_PROMPT = """
You are a helpful assistant specialized in explaining fields in official forms.
You MUST answer in the language specified by `target_lang`.
Return ONLY a JSON object in that language with these keys:
{
  "explanation": "Selkokielinen ohje kentän täyttämiseen.",
  "action": "Miksi tätä kysytään / miksi tieto on tarpeen.",
  "example": "Yksi konkreettinen esimerkki, joka sopii kenttään.",
  "tips": "Lyhyet vinkit kentän täyttöön."
}
"""

def explain_with_gemini(gemini_input: dict, target_lang: str):
    aiplatform.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel(GEMINI_MODEL, system_instruction=GEMINI_SYSTEM_PROMPT)
    user_message = (
        f"target_lang: {target_lang}\n"
        f"Here is the form field data as JSON: {json.dumps(gemini_input, ensure_ascii=False)}"
    )
    resp = model.generate_content(user_message, generation_config={"response_mime_type": "application/json"})
    return json.loads(resp.text)

def safe_translate_text(text: str, target_lang: str):
    """Translate if possible, otherwise return original."""
    if not text:
        return text
    if not PROJECT_ID:
        return text
    try:
        return translate_text(text, "en", target_lang)
    except Exception as e:
        print(f"Translation fallback used: {e}")
        return text

def local_rule_response(field_label: str, section_context: str) -> dict:
    """Heuristic, fast fallback without cloud models."""
    label = (field_label or "").strip()
    ctx = f"{label} {section_context}".lower()

    def resp(explanation, example, action, tips=""):
        return {
            "explanation": explanation,
            "example": example,
            "action": action,
            "tips": tips,
        }

    if any(k in ctx for k in ["henkilötunnus", "personnummer", "social security", "ssn"]):
        return resp(
            "Anna henkilötunnus muodossa ppkkvv-xxxx. Käytä virallista muotoa ilman välilyöntejä.",
            "131052-308T",
            "Syötä henkilötunnus täsmälleen virallisessa muodossa."
        )
    if any(k in ctx for k in ["etunimi", "förnamn", "first name"]):
        return resp(
            "Kirjoita etunimi täsmälleen virallisissa asiakirjoissa olevassa muodossa.",
            "Matti",
            "Käytä samaa etunimeä kuin henkilöllisyystodistuksessa."
        )
    if any(k in ctx for k in ["sukunimi", "efternamn", "last name", "surname"]):
        return resp(
            "Kirjoita sukunimi virallisessa muodossa.",
            "Virtanen",
            "Käytä virallista sukunimeä ilman lyhenteitä."
        )
    if any(k in ctx for k in ["osoite", "adress", "address", "street"]):
        return resp(
            "Anna katuosoite talon- ja mahdollinen huoneistonumero mukaan lukien.",
            "Esimerkkikatu 5 A 2",
            "Kirjoita katuosoite täsmälleen lomakkeen pyytämässä muodossa."
        )
    if any(k in ctx for k in ["postinumero", "postnr", "zip", "postcode"]):
        return resp(
            "Anna postinumero ilman kirjaimia.",
            "00100",
            "Syötä numerot ilman välilyöntejä."
        )
    if any(k in ctx for k in ["puhelin", "telefon", "phone", "mobile"]):
        return resp(
            "Anna puhelinnumero maatunnuksella.",
            "+358 40 1234567",
            "Käytä kansainvälistä muotoa (+maa-koodi) ja poista turhat välit."
        )
    if any(k in ctx for k in ["sähköposti", "e-mail", "email", "eposti", "e-post"]):
        return resp(
            "Anna toimiva sähköpostiosoite.",
            "etunimi.sukunimi@example.com",
            "Varmista että osoite on käytössä ja kirjoita se ilman ylimääräisiä välilyöntejä."
        )
    if any(k in ctx for k in ["iban", "tilinumero", "bank account"]):
        return resp(
            "Syötä tilinumero IBAN-muodossa ilman välilyöntejä.",
            "FI21 1234 5600 0007 85",
            "Käytä virallista IBAN-muotoa. Poista erikoismerkit jos lomake niin pyytää."
        )
    if any(k in ctx for k in ["päivämäär", "datum", "date"]):
        return resp(
            "Anna päivämäärä pyydetyssä muodossa (esim. pp.kk.vvvv).",
            "31.12.2025",
            "Käytä samaa erottelutapaa kuin lomakkeessa, älä käytä kirjaimia."
        )
    if any(k in ctx for k in ["summa", "belopp", "amount", "eur", "€"]):
        return resp(
            "Anna rahamäärä numeroina. Käytä pilkkua tai pistettä desimaalierottimena ohjeen mukaan.",
            "1234,56",
            "Älä lisää valuuttamerkkiä ellei lomake pyydä sitä."
        )
    if any(k in ctx for k in ["kyllä", "ja", "nej", "ei", "yes", "no", "valitse", "rastita"]):
        return resp(
            "Valitse vaihtoehto, joka vastaa tilannettasi.",
            "Rastita 'Kyllä' jos ehto toteutuu, muuten 'Ei'.",
            "Jos mikään vaihtoehdoista ei sovi, seuraa lomakkeen ohjeita lisäselvityksen antamiseksi."
        )
    # Default fallback
    return resp(
        f"{label or 'Kenttä'} on lomakkeen kenttä. Täytä pyydetty tieto selkeästi.",
        "Esimerkki tähän kenttään sopivasta syötteestä.",
        "Täytä kenttä täsmälleen lomakkeen ohjeiden mukaisesti. Käytä virallista kirjoitusasua ja numeroita."
    )

def fallback_field_response(field_label: str) -> dict:
    """Basic local fallback without Gemini."""
    return local_rule_response(field_label, "")

# ===========================================================
#  Endpoints
# ===========================================================
@app.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    print(f"Processing file: {file.filename}")
    pdf_bytes = await file.read()
    redacted_pdf = redact_pdf_with_dlp(pdf_bytes)
    try:
        if DOCAI_PROCESSOR_ID:
            doc_dict = process_pdf_with_docai(redacted_pdf)
        else:
            doc_dict = fallback_pdf_summary(redacted_pdf)
    except Exception as e:
        print(f"DocAI Error: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
    return JSONResponse({"status": "ok", "page_count": len(doc_dict.get("pages", [])), "document": doc_dict})

@app.post("/analyze-field")
async def analyze_field(payload: dict):
    try:
        field_label = payload.get("field_context") or ""
        section_context = payload.get("section_context") or ""
        target_lang = payload.get("target_lang") or "fi"
        safe_label = mask_pii_local(field_label)
        gemini_input = {
            "field_label": safe_label,
            "section_context": section_context,
            "form_name": payload.get("form_name") or "",
            "page_context": payload.get("page_context") or "",
            "form_language": "detected"
        }
        use_cloud_ai = bool(PROJECT_ID and GAC_PATH and GEMINI_MODEL)

        if use_cloud_ai:
            try:
                gemini_result = explain_with_gemini(gemini_input, target_lang)
            except Exception as e:
                print(f"Analyze field error (Gemini): {e} -- using fallback response")
                gemini_result = fallback_field_response(safe_label)
        else:
            gemini_result = fallback_field_response(safe_label)

        if use_cloud_ai:
            # Gemini already answered in target language
            return JSONResponse({
                "status": "ok",
                "explanation_target_lang": gemini_result.get("explanation", ""),
                "instructions_target_lang": gemini_result.get("action", ""),
                "example_target_lang": gemini_result.get("example", ""),
                "tips_target_lang": gemini_result.get("tips", ""),
            })
        else:
            return JSONResponse({
                "status": "ok",
                "explanation_target_lang": safe_translate_text(gemini_result.get("explanation", ""), target_lang),
                "instructions_target_lang": safe_translate_text(gemini_result.get("action", ""), target_lang),
                "example_target_lang": safe_translate_text(gemini_result.get("example", ""), target_lang),
                "tips_target_lang": safe_translate_text(gemini_result.get("tips", ""), target_lang),
            })
    except Exception as e:
        print(f"Analyze field fatal error: {e}")
        return JSONResponse({"status": "ok", "explanation_target_lang": "Palvelu ei vastaa.", "instructions_target_lang": "", "example_target_lang": ""})
