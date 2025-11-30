FROM python:3.11-slim

# Estetään pyc-tiedostot ja bufferoidut stdoutit
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Työhakemisto kontissa
WORKDIR /app

# 1. Asennetaan riippuvuudet ensin (välimuistin optimointi)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. TÄRKEÄ KORJAUS: Kopioidaan KAIKKI tiedostot (myös index.html ja assets/)
COPY . .

# Cloud Run odottaa palvelun kuuntelevan porttia 8080
ENV PORT=8080

# Käynnistyskomento
# (Käytetään shell-muotoa jotta $PORT muuttuja toimisi, tai kovakoodataan 8080 kuten teit)
CMD uvicorn main:app --host 0.0.0.0 --port 8080
