# Scripts-kansio (jobs/scripts)

Tässä kansiossa on sovelluksen i18n- ja kehitysapuskriptejä Jobs-moduulille.
Pääasiallinen skripti on `validate-i18n.js`, joka auttaa pitämään käännöstiedostot yhdenmukaisina.

---

## Mikä on `validate-i18n.js`?

Node-skripti, joka validoi kaikki `assets/i18n/*.json` -käännöstiedostot suhteessa
referenssiin `en.json`.

- Tarkistaa, että kaikista kielistä löytyvät samat avainpolut kuin englannista.
- Ilmoittaa puuttuvat (`missing`) ja ylimääräiset (`extra`) avaimet.
- Palauttaa virhekoodin (`exit code 1`), jos puuttuvia avaimia löytyy.
  - `--strict`-tilassa myös ylimääräiset avaimet aiheuttavat virheen.

---

## Käyttö

Aja skripti Jobs-moduulin juuresta (eli tästä kansiosta ylätasosta `jobs/`):

```
cd apps/apply/jobs
node scripts/validate-i18n.js [optiot]
```

Yleisimmät optiot:

- `--only=de` — validoi vain tietyn kielen (esim. `de`).
- `--exclude=fi,manifest` — jätä pois listatut kielet/tiedostot (ilman `.json`).
- `--strict` — merkitse myös ylimääräiset avaimet virheiksi (exit code 1).

Esimerkkejä:

```
# Kaikki kielet vs. en.json
node scripts/validate-i18n.js

# Vain saksa
node scripts/validate-i18n.js --only=de

# Ohita fi ja manifest
node scripts/validate-i18n.js --exclude=fi,manifest

# Tiukka moodi (puuttuvat ja ylimääräiset ovat virheitä)
node scripts/validate-i18n.js --strict
```

---

## Mitä skripti tarkistaa?

- JSON-syntaksin (virheelliset JSONit ilmoitetaan tiedostokohtaisesti).
- Avainpolkujen yhdenmukaisuuden: muodostaa tasatut avainpolut (esim. `legal.privacy.title`).
- Raportoi korkeintaan 30 ensimmäistä puuttuvaa ja ylimääräistä avainta per kieli.

---

## Exit-koodit

- `0` — kaikki kunnossa (ei puuttuvia; `--strict`-tilassa ei ylimääräisiäkään).
- `1` — löytyi puuttuvia (ja/tai `--strict`-tilassa ylimääräisiä) avaimia.
- `2` — ympäristö-/tiedostovirhe (esim. `assets/i18n` tai `en.json` puuttuu).

---

## Vinkit

- Aja validaattori ennen commit/push, jotta käännösavaimet pysyvät linjassa.
- Käännettävät avaimet ovat samat kaikissa kielissä; sisältö voi vaihdella.
- Oletusarvoisesti `manifest.json` ohitetaan (`--exclude`) jotta se ei häiritse validaatiota.

