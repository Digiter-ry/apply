# 🤝 Contributing to Apply

Welcome — and thank you for your interest in contributing to **Apply**,  
an open modular service developed under the **Kanavana** brand in collaboration with **Digiter ry**.

This document explains how to get started, what kind of contributions are welcome, and the technical and security standards that must be followed.

---

## 🧭 Project Context

Apply is part of a broader open digital ecosystem.  
It is included in multiple funding applications:
- AID4SME Open Call 1 (Kanavana)  
- NLnet Foundation grant (Kanavana)  
- AMIF consortium application (Digiter ry)  
- Kone Foundation application (Digiter ry)

Kanavana focuses on the **commercial product track**, while Digiter ry leads the **nonprofit and open source development track**.  
Both share the same **core codebase**.

---

## 🪜 How to Contribute

We welcome contributions from:
- Developers (frontend / backend / AI integrations)
- Designers (UI/UX, accessibility, language support)
- Translators and documentation writers
- Research and EU project partners

Ways to contribute:
1. 🐞 **Report issues** – Found a bug or idea? [Open an issue](../../issues).  
2. 💡 **Propose enhancements** – Suggest new features or improvements.  
3. 🧑‍💻 **Submit pull requests** – Contribute code or documentation.  
4. 🌍 **Help with language support** – Apply is multilingual and inclusive.

---

## 🧭 Coding Guidelines

To keep the codebase clean, secure and maintainable:

- ❌ **No inline JS or CSS.** All scripts and styles must live in separate files.
- 📦 **No external CDN libraries** by default. Host assets locally.  
  - **Allowed exceptions (match CSP):**  
    - `https://cdn.jsdelivr.net` (scripts)  
    - `https://fonts.googleapis.com` (CSS)  
    - `https://fonts.gstatic.com` (WOFF2 fonts)
- 🧩 **Modular structure:** Each Apply module in its own folder (e.g. `jobs/`, `permit/`, `decision/`). Keep UI ↔ API strictly separated.
- 🌐 **English for code, comments and commits.**
- 🧪 **Test locally** before PRs. No failing console errors; CSP violations must be zero.
- 🧼 Prefer small, single-purpose functions, clear names (`camelCase` for JS, `kebab-case` for files).
- 🔐 **Never commit secrets** (.env, API keys, tokens, DB dumps).  
- 📝 If unsure about a library or pattern, **open an Issue** first.

Optional but encouraged:
- Consistent naming conventions and clean commit messages.
- Accessibility (WCAG) considerations.

---

## 🛡️ Security Baseline

Our production environment uses strict HTTP headers. Frontend code **must** comply:

**Content-Security-Policy (CSP):**
```
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net;
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data:;
connect-src 'self';
worker-src 'self' blob:;
child-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

**Other security headers:**
- `X-Content-Type-Options: nosniff`  
- `Referrer-Policy: strict-origin-when-cross-origin`  
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`  
- `Strict-Transport-Security` on HTTPS  
- `X-Robots-Tag: noindex` in pilot environments

**Practical implications for contributors:**
- No inline `<script>` / `<style>` or inline event handlers (`onclick`, etc.).
- No third-party iframes or analytics without approval.
- Only small inline images/icons via `data:`.
- Workers must load from `self`.

---

## ⚠️ CSP Exception Process (rare)

If a feature **requires** a new origin (e.g., a vetted external API or script):

1. Open an Issue titled **“CSP Exception Request: <origin> for <feature>”**.  
2. Provide: purpose, file paths, origin(s), risk assessment, fallback plan.  
3. Maintainers will review. If approved:
   - Add the origin to CSP configuration,
   - OR define a page-specific CSP and document it.

❌ Direct PRs introducing new external origins without following this process will be rejected.

---

## ✅ PR Checklist

Copy this checklist into your PR description:

- [ ] No inline JS/CSS  
- [ ] No secrets committed  
- [ ] No new external origins (or approved via CSP Exception Process)  
- [ ] No CSP violations in browser console  
- [ ] Works under default CSP with allowed fonts/jsdelivr only  
- [ ] UI and backend strictly separated  
- [ ] Accessibility basics checked (labels, contrast, keyboard nav)

---

## 🧪 Branching & Pull Requests

- Create a **feature branch**, e.g. `feature/your-feature-name`.  
- Make a pull request to `main` when ready.  
- Use clear commit messages (short summary + details).  
- PR must pass the checklist above.

If unsure — open an Issue first. We’ll find the right approach together.

---

## 🪙 License & Openness

This project is licensed under **Apache License 2.0**.  
All contributions will become part of the public codebase.  
Do **not** include any sensitive or private information in your commits.

---

## 📢 Code of Conduct

We aim to build an inclusive, respectful and transparent environment.
- Be kind and constructive.  
- No harassment, discrimination or exclusionary behavior.  
- Act in good faith.

---

## 📨 Contact

- **Project lead:** Tomi Turpeinen / Digiter ry  
- 🌐 [Kanavana.fi](https://kanavana.fi) | [Digiter.fi](https://digiter.fi)  
- 💬 For collaboration inquiries, open an issue or contact the project team.

---

Thank you for contributing 💙  
Together we build **open, inclusive and practical AI-powered services** for everyone.
