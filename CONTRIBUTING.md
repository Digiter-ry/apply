# Contributing Guidelines

Welcome to contributing to the **Apply** service — part of the collaboration between **Digiter ry** and the **Kanavana** brand.  
This document defines the coding, security, and contribution practices to ensure a consistent and safe development workflow for everyone.

---

## 🧭 General Principles

- All development is done **openly and documented**.
- `main` is always production-ready and protected.
- New features and changes are developed in the **dev** branch.
- Every change must go through the **Pull Request (PR)** process.
- Folder structure and code style must stay consistent.

---

## 📁 Recommended Folder Structure (XAMPP / Docker / Git)

```
digiter/
└── apps/
    └── apply/
        ├── jobs/           # UI (HTML/CSS/JS)
        ├── assets/
        │   ├── css/
        │   └── js/
        ├── api/            # backend (later)
        ├── conf/           # no secrets
        └── README.md
```

> 🛡️ **NOTE:** Never commit `.env` or other secret configuration files to Git.  
> All keys and configuration values are stored securely on the server.

---

## 🧑‍💻 Coding Guidelines

- No inline JS or CSS — always use separate files.
- No external libraries without explicit approval (strict CSP policy).
- Fonts and scripts must be self-hosted or from approved CDNs.
- Use clear, descriptive filenames.
- Comment code clearly and logically.
- Follow accessibility guidelines (WCAG) in HTML/CSS structure.

---

## 🛡️ Security Requirements

The server-side **Content-Security-Policy (CSP)** enforces strict rules:
- `script-src 'self'` — no external scripts unless approved.
- `style-src 'self' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com data:`
- `img-src 'self' data:`
- `connect-src 'self'`
- `frame-ancestors 'none'` — no external iframes or embedding.

All frontend changes must be tested with CSP enabled before merging.

---

## 🪜 Git Branching Strategy

- `main` = protected, production-ready branch  
- `dev` = active development branch  
- Other branches:
  - `feature/...` for new features
  - `fix/...` for bug fixes
  - `docs/...` for documentation

---

## 📝 Commit Message Guidelines

Use short, clear messages like:

```
feat(ui): change navbar color
fix(jobs): correct mobile layout
docs: add onboarding guide
```

- Prefer English commit messages.
- Keep commits small and focused.
- Never commit secrets or configuration files.

---

## 🔀 Pull Request Workflow (dev → main)

Goal: keep `main` always production-ready and ensure all changes go through controlled review.

### ✅ PR Checklist

- [ ] Work in **dev** branch
- [ ] `git push origin dev`
- [ ] Open a PR: **base = main**, **compare = dev**
- [ ] Use a descriptive title and short description
- [ ] Add screenshots for UI changes (if relevant)
- [ ] At least **1 approval** is required before merging

### PR Content

- **Title:** what and why (e.g. *Update navbar color and background*)
- **Description:** bullet list of main changes
- **Size:** smaller PRs are better than one big one
- **Testing:** describe how to reproduce and test

### Review & Merge

- Minimum 1 approval before merge
- Squash / Rebase / Merge based on team policy
- No direct commits to `main`
- Admin bypass is allowed only in exceptional cases

---

## 🚨 Conflict Resolution

If there are conflicts:

```bash
git checkout dev
git fetch origin
git merge origin/main
# resolve conflicts and test
git push origin dev
```

---

## 🚀 After Merging

```bash
git checkout dev
git pull origin main
```

Keep dev up-to-date with main to avoid future conflicts.

---

## 🔐 Do Not Commit

- `.env` or other configuration files
- API keys
- Server credentials
- Access tokens or passwords
- Personal data

---

## 🧾 License & Open Development

This project is licensed under the [Apache License 2.0](LICENSE).  
All contributions are welcome — transparent, open, and responsible.

---

Thank you for contributing ❤️  
Together we build safe and accessible services.
