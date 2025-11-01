# 🌐 Digiter Apply — Supported Languages

**Updated:** 2025-11-01  
**Maintainer:** Digiter ry (it@digiter.fi, tomi@kanavana.fi)  
**Purpose:** Document of all officially supported interface languages for the `apply.digiter.fi` module.  
This multilingual coverage ensures accessibility and inclusion across the EU area and beyond.

---

## 🗣️ Overview

| Code   | Language (Native) | Language (English) | Direction | Notes                           |
| ------ | ----------------- | ------------------ | --------- | ------------------------------- |
| **fi** | Suomi             | Finnish            | LTR       | Primary language                |
| **en** | English           | English            | LTR       | Default fallback                |
| **sv** | Svenska           | Swedish            | LTR       | Nordic language support         |
| **et** | Eesti             | Estonian           | LTR       | Baltic coverage                 |
| **ru** | Русский           | Russian            | LTR       | Eastern EU border region        |
| **uk** | Українська        | Ukrainian          | LTR       | Eastern European inclusion      |
| **so** | Soomaali          | Somali             | LTR       | Community inclusion language    |
| **fr** | Français          | French             | LTR       | EU official language            |
| **de** | Deutsch           | German             | LTR       | EU official language            |
| **es** | Español           | Spanish            | LTR       | EU official language            |
| **it** | Italiano          | Italian            | LTR       | EU official language            |
| **sk** | Slovenčina        | Slovak             | LTR       | Central Europe                  |
| **pt** | Português         | Portuguese         | LTR       | EU & Lusophone world            |
| **cs** | Čeština           | Czech              | LTR       | Central Europe                  |
| **ar** | العربية           | Arabic             | RTL       | Minority inclusion language     |
| **fa** | فارسی             | Persian            | RTL       | Integration & community support |

---

## 📘 Language Integration

All translations follow a shared JSON structure compatible with the Apply module’s i18n engine:

```json
{
  "hero": {
    "title": "...",
    "lead": "...",
    "step1": "...",
    "step2": "...",
    "step3": "..."
  },
  "legal": {
    "about": {...},
    "ai": {...},
    "privacy": {...},
    "terms": {...}
  }
}
```

Each language file is named according to its ISO code, for example:

```
/i18n/en.json
/i18n/sv.json
/i18n/ar.json
```

---

## 🧭 Localization Principles

1. **Digiter style:** Clear, empathetic, and trustworthy tone — not bureaucratic.
2. **English determines meaning:** Translations follow English semantics first, adapting culturally only when needed.
3. **Consistency:** All keys remain identical across languages for stable i18n operations.
4. **Accessibility:** Both left-to-right (LTR) and right-to-left (RTL) languages are fully supported.
5. **Privacy compliance:** All translations reflect GDPR-safe wording and user awareness.

---

## 🌍 Summary

With 16 supported languages, the Apply module now provides one of the most extensive multilingual coverages among EU-based civic AI tools.  
This linguistic inclusivity strengthens Digiter’s mission:

> _“To make digital services understandable and accessible to everyone — regardless of language or background.”_

---

**Digiter ry**  
📍 Helsinki, Finland  
🔗 [https://digiter.fi](https://digiter.fi)
