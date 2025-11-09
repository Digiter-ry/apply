# 🤝 Contributing Guidelines

Welcome to contributing to the **Apply service**, which is part of the collaboration between the **Digiter ry** non-profit organization and the **Kanavana brand**.  
This document defines the coding, security, and contribution practices to ensure a consistent and safe development workflow for everyone.

---

## 🧩 Overview and General Principles

### 🧭 General Principles
- All development is done openly and documented.  
- The **main** branch is always production-ready and protected.  
- New features and changes are developed in the **dev** branch.  
- Every change must go through the Pull Request (PR) process.  
- Folder structure and code style must stay consistent.

### 🌍 Overview
**Digiter Apply** is part of Digiter ry’s initiative to build open, accessible, and AI-assisted digital services for employment and learning.  
The project is community-driven, open-source, and welcomes volunteers of all experience levels.

---

## 🔧 Development Environment and Getting Started

### 🧱 Technical Details
The environment runs with Docker and includes:
- PHP 8.2 (FPM Alpine)
- Nginx 1.27
- Caddy 2 (reverse proxy + HTTPS)
- OAuth2 Proxy (Google login)
- Centralized `.env` files stored in `/home/infra/env/`

Development branch: **dev**  
Production branch: **main**

### 🚀 Getting Started Instructions
```bash
git clone https://github.com/Digiter-ry/apply.git
cd apply
cp /home/infra/env/apply.env .env
docker compose up -d
```
Open in browser: [https://dev-apply.digiter.fi](https://dev-apply.digiter.fi)  
> 🔒 Note: Login requires a Google account (@digiter.fi or authorized domain).

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

---

## 🧑‍💻 Coding Guidelines
- No inline JS or CSS — always use separate files.  
- No external libraries without explicit approval (**strict CSP policy**).  
- Fonts and scripts must be self-hosted or from approved CDNs.  
- Use clear, descriptive filenames.  
- Comment code clearly and logically.  
- Follow accessibility guidelines (WCAG) in HTML/CSS structure.

---

## 🛡️ Security and File Policy

### 🔒 CSP Requirements (Content-Security-Policy)
The server-side Content-Security-Policy (CSP) enforces strict rules:
```
script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
```
All frontend changes must be tested with CSP enabled before merging.

### 🔐 Do Not Commit
- `.env` or other configuration files  
- `.htaccess` files  
- any files inside `secrets/`  
- API keys  
- Server credentials, access tokens, or passwords  
- Personal data

> The `.gitignore` file already prevents tracking these files.  
> If sensitive data was accidentally committed, contact the maintainers immediately (`it@digiter.fi`).

---

## 🔀 Git Branching Strategy and PR Process

### 🪜 Branching Strategy
- `main` = protected, production-ready branch  
- `dev` = active development branch  
- `feature/...` for new features  
- `fix/...` for bug fixes  
- `docs/...` for documentation

### 📝 Commit Message Guidelines
Use short, clear messages like:
```
feat(ui): change navbar color
fix(jobs): correct mobile layout
docs: add onboarding guide
```
Prefer English commit messages and keep commits small and focused.

---

## 🧱 Pull Request (PR) Process

Always work in the **dev** branch. When the feature or fix is ready, open a **Pull Request (PR)**.

### ✅ PR Checklist (dev → main)
- [ ] Work in dev branch.  
- [ ] `git push origin dev`.  
- [ ] Open PR: base = main, compare = dev.  
- [ ] Use a descriptive title and short description.  
- [ ] Add screenshots for UI changes (if relevant).  
- [ ] Use the `PULL_REQUEST_TEMPLATE.md` format for consistency.  
- [ ] At least 1 approval is required before merging.

### 🔎 PR Content Confirmation
- Docker builds successfully  
- `.env` and secrets are excluded  
- `README-DEV.md` remains up to date

### 🔄 Review & Merge
- Minimum 1 approval before merge  
- Squash / Rebase / Merge based on team policy  
- No direct commits to `main`  
- Admin bypass only in exceptional cases

---

## 🚨 Conflict Resolution
```bash
git checkout dev
git fetch origin
git merge origin/main
# resolve conflicts and test
git push origin dev
```

### 🚀 After Merging
```bash
git checkout dev
git pull origin main
```
Keep `dev` up-to-date with `main` to avoid future conflicts.

---

## 🐞 Issue Reporting
All bugs and feature ideas are tracked under the GitHub **Issues** tab.  
Use the **ISSUE_TEMPLATE.md** for clear reporting and include a screenshot if relevant.

---

## 🙌 Volunteering and Learning
Digiter ry offers a platform for volunteers to practice real-world development, AI-assisted workflows, and collaborative open-source contributions.  
Responsibilities and learning goals are agreed upon individually based on experience.

---

## 🧾 License & Open Development
This project is licensed under the **Apache License 2.0**.  
All contributions are welcome — transparent, open, and responsible.

Thank you for contributing ❤️ Together we build safe and accessible services.

---

# 🤝 Contributing Guidelines | Ohjeet vapaaehtoisille ja kehittäjille

Tervetuloa osallistumaan **Apply-palvelun kehitykseen**, joka on osa **Digiter ry** -järjestön ja **Kanavana-brändin** yhteistyötä.  
Tämä dokumentti määrittelee koodaus-, turvallisuus- ja osallistumiskäytännöt johdonmukaisen ja turvallisen kehitystyön varmistamiseksi.

---

## 🇫🇮 Yleiskatsaus ja Yleiset Periaatteet

### 🧩 Yleistä
Digiter Apply on osa Digiter ry:n hanketta, jossa rakennetaan avoimia, saavutettavia ja tekoälyavusteisia verkkopalveluja työnhaun ja oppimisen tueksi.  
Projektia kehitetään vapaaehtoisvoimin ja oppimisen hengessä – kaikki osallistujat ovat tervetulleita.

### 🧭 Perusperiaatteet
- Kaikki kehitystyö tehdään avoimesti ja dokumentoidusti.  
- **main** on aina tuotantovalmis ja suojattu haara.  
- Uudet ominaisuudet ja muutokset kehitetään **dev**-haarassa.  
- Jokainen muutos viedään Pull Request (PR) -prosessin kautta.  
- Kansiorakenteen ja koodityylin on pysyttävä johdonmukaisena.

---

## 🔧 Kehitysympäristö ja Aloitus

### 🧱 Tekniset tiedot
Kehitysalusta toimii Docker-pohjaisesti ja sisältää:
- PHP 8.2 (FPM Alpine)
- Nginx 1.27
- Caddy 2 (reverse proxy + HTTPS)
- OAuth2 Proxy (Google login)
- Keskitetyt `.env`-tiedostot `/home/infra/env/`-hakemistossa

Kehityshaara: **dev**  
Julkaisuhaara: **main**

### 🚀 Aloitusohjeet (Getting Started)
```bash
git clone https://github.com/Digiter-ry/apply.git
cd apply
cp /home/infra/env/apply.env .env
docker compose up -d
```
Avaa selaimessa: [https://dev-apply.digiter.fi](https://dev-apply.digiter.fi)  
> 🔒 Kirjautuminen vaatii Google-tilin (@digiter.fi tai valtuutettu domain).

---

## 📁 Kansiorakenne (Folder Structure)

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

---

## 🧑‍💻 Koodaus- ja Tyyliohjeet

- Ei inline JS:ää tai CSS:ää — käytä aina erillisiä tiedostoja.  
- Ei ulkoisia kirjastoja ilman nimenomaista hyväksyntää (**strict CSP**).  
- Fontit ja skriptit on oltava itse hostattuja tai hyväksytyiltä CDN:iltä.  
- Käytä selkeitä, kuvaavia tiedostonimiä.  
- Kommentoi koodi selkeästi ja loogisesti.  
- Noudata saavutettavuusohjeita (WCAG) HTML/CSS-rakenteessa.

---

## 🛡️ Turvallisuus ja Tiedostopolitiikka (Security & File Policy)

### 🔒 CSP-vaatimukset (Content-Security-Policy)
Palvelinpuolen CSP valvoo tiukkoja sääntöjä:
```
script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
```
Kaikki frontend-muutokset on testattava CSP:n ollessa käytössä ennen yhdistämistä.

### 🔐 Älä koskaan lisää GitHubiin (Do Not Commit)
- `.env` tai muut konfiguraatiotiedostot  
- `.htaccess`-tiedostoja  
- `secrets/`-kansiota tai sen sisältöjä  
- API-avaimia, palvelintunnuksia tai access-tokeneita  
- Henkilökohtaisia tietoja

> `.gitignore` estää arkaluonteisten tiedostojen versionhallinnan automaattisesti.  
> Jos epäilet, että vahingossa on lisätty arkaluonteinen tiedosto, ota heti yhteys ylläpitoon (it@digiter.fi).

---

## 🔀 Git-haaroitusstrategia ja PR-prosessi

### 🪜 Haaroitusstrategia (Branching Strategy)
- `main` = suojattu, tuotantovalmis haara  
- `dev` = aktiivinen kehityshaara  
- `feature/...` uusille ominaisuuksille  
- `fix/...` bugikorjauksille  
- `docs/...` dokumentaatiolle

### 📝 Commit-viestit (Commit Message Guidelines)
Käytä lyhyitä ja kuvaavia viestejä:
```
feat(ui): change navbar color
fix(jobs): correct mobile layout
docs: add onboarding guide
```
Suosi englanninkielisiä commit-viestejä ja pidä commitit pieninä.

---

## 🧱 Pull Request (PR) Käytäntö

Tee muutokset aina **dev**-haaraan.  
Kun ominaisuus tai korjaus on valmis, luo **Pull Request**.

### ✅ PR-tarkistuslista (dev → main)
- [ ] Työskentele dev-haarassa  
- [ ] `git push origin dev`  
- [ ] Avaa PR : base = main, compare = dev  
- [ ] Käytä kuvaavaa otsikkoa ja kuvausta  
- [ ] Lisää kuvakaappaukset käyttöliittymämuutoksista  
- [ ] Käytä `PULL_REQUEST_TEMPLATE.md`-formaattia  
- [ ] Vähintään 1 hyväksyntä tarvitaan ennen mergeä  

### 🔎 PR-sisällön vahvistus
- Docker käynnistyy virheettä  
- `.env` ja salaisuudet eivät ole mukana  
- `README-DEV.md` on ajantasainen  

### 🔄 Review & Merge
- Käytä Squash / Rebase / Merge tiimikäytännön mukaan  
- Ei suoria committeja `main`-haaraan  
- Admin-ohitus vain poikkeustapauksissa

---

## 🚨 Ristiriitojen Ratkaisu (Conflict Resolution)

```bash
git checkout dev
git fetch origin
git merge origin/main
# resolve conflicts and test
git push origin dev
```

### 🚀 Mergen jälkeen (After Merging)
```bash
git checkout dev
git pull origin main
```
Pidä `dev` ajan tasalla `main`-haaran kanssa ristiriitojen välttämiseksi.

---

## 🐞 Issue-prosessi

Kaikki bugit ja kehitysideat kirjataan GitHubin **Issues**-välilehdelle.  
Käytä valmista mallia **ISSUE_TEMPLATE.md** ja lisää kuvakaappaus, jos mahdollista.

---

## 🙌 Vapaaehtoistyö ja Oppiminen

Digiter ry tarjoaa vapaaehtoisille mahdollisuuden harjoitella käytännön ohjelmistokehitystä, tekoälyn hyödyntämistä ja avoimen lähdekoodin yhteistyötä.  
Työmäärä ja vastuu sovitaan aina osallistujan osaamistason mukaan.

---

## 🧾 Lisenssi ja Avoin Kehitys

Tämä projekti on lisensoitu **Apache License 2.0** -lisenssillä.  
Kaikki kontribuutiot ovat tervetulleita — läpinäkyvää, avointa ja vastuullista kehitystä.

---

**Kiitos panoksestasi ❤️**  
*Yhdessä rakennamme turvallisia ja saavutettavia palveluja.*
