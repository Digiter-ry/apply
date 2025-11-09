# Digiter Apply – Kehitysympäristö / Development Environment

---

## 🇫🇮 Tervetuloa Digiter Apply -kehitykseen

**Digiter Apply** on avoin kehitysympäristö, jonka tavoitteena on rakentaa saavutettavia, tekoälyavusteisia verkkopalveluja työnhaun ja oppimisen tueksi.  
Projekti toimii osana **Digiter ry:n** toimintaa ja tarjoaa vapaaehtoisille mahdollisuuden oppia DevOps-, front-end- ja tekoälyintegraatioita käytännössä.

### 🔧 Kehitysympäristö
Palvelu toimii Docker-pohjaisessa ympäristössä:
- **PHP 8.2 (FPM Alpine)**
- **Nginx 1.27**
- **Caddy 2** (Reverse proxy + HTTPS)
- **OAuth2 Proxy** (Google login)
- Keskitetyt `.env`-tiedostot (`/home/infra/env/`)

### 🚀 Aloitusohjeet
1. Kloonaa repo:
   ```bash
   git clone https://github.com/Digiter-ry/apply.git
   cd apply
   ```
2. Kopioi ympäristömuuttujat:  
   ```bash
   cp /home/infra/env/apply.env .env
   ```
3. Käynnistä Docker:  
   ```bash
   docker compose up -d
   ```
4. Avaa selaimessa:  
   👉 **https://dev-apply.digiter.fi**

> 🔒 Kirjautuminen vaatii Google-tilin (@digiter.fi tai valtuutettu domain).

### 🤝 Kontribuointi
- Tee muutokset aina **dev-haaraan**
- Luo **Pull Request (PR)** ennen yhdistämistä `main`iin
- Älä lisää `.env`, `index.php` tai `style.css` GitHubiin
- Katso lisäohjeet tiedostosta **[CONTRIBUTING.md](CONTRIBUTING.md)**

---

## 🇬🇧 Welcome to Digiter Apply Development

**Digiter Apply** is an open development environment aiming to create accessible, AI-assisted web services that support job seeking and learning.  
It is part of **Digiter ry’s** non-profit activities and offers volunteers a chance to gain practical experience in DevOps, front-end, and AI integration.

### 🔧 Environment Overview
The service runs inside a Docker-based stack:
- **PHP 8.2 (FPM Alpine)**
- **Nginx 1.27**
- **Caddy 2** (Reverse proxy + HTTPS)
- **OAuth2 Proxy** (Google login)
- Centralized `.env` configuration files (`/home/infra/env/`)

### 🚀 Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/Digiter-ry/apply.git
   cd apply
   ```
2. Copy the environment variables:
   ```bash
   cp /home/infra/env/apply.env .env
   ```
3. Start Docker:
   ```bash
   docker compose up -d
   ```
4. Open in your browser:  
   👉 **https://dev-apply.digiter.fi**

> 🔒 Login requires a Google account (@digiter.fi or authorized domain).

### 🤝 Contributing
- Work on the **dev** branch  
- Always open a **Pull Request** before merging into `main`  
- Do not commit `.env`, `index.php`, or `style.css`  
- See **[CONTRIBUTING.md](CONTRIBUTING.md)** for detailed guidelines

---

### 🧩 Open Source by Digiter ry
This project is developed and maintained by volunteers under **[Digiter ry](https://digiter.fi)** – a non-profit association promoting digital inclusion, accessibility, and AI literacy in Finland.
