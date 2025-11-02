#!/usr/bin/env node
/* fill-i18n-missing.js - Add missing status.* and apikey.* keys to all languages using en.json as base.
   Also apply targeted fixes to specific languages (fi/de/fr/it/sv/et).
*/
const fs = require('fs');
const path = require('path');
const I18N_DIR = path.join(process.cwd(), 'assets', 'i18n');

function load(code){
  const p = path.join(I18N_DIR, `${code}.json`);
  return { path: p, json: JSON.parse(fs.readFileSync(p, 'utf8')) };
}
function save(p, json){
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

function ensureStatusAndApi(json, en){
  json.status ||= {};
  const keys = ['scouting','scoutReady','scoutFailed','generating','generateFailed'];
  for (const k of keys){ if (!(k in json.status)) json.status[k] = en.status[k]; }
  if (!json.apikey) json.apikey = { ...en.apikey };
}

function run(){
  const langs = fs.readdirSync(I18N_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json').map(f => path.basename(f,'.json'));
  if (!langs.includes('en')) throw new Error('Missing en.json');
  const en = load('en').json;

  for (const code of langs){
    const { path: p, json } = load(code);
    // add missing status/apikey
    ensureStatusAndApi(json, en);

    // targeted fixes
    if (code === 'fi') {
      json.brand = 'Brändi';
    }
    if (code === 'de') {
      json.label.role = 'Stelle';
      if (json.export) json.export.role = 'Stelle:';
      json.assist ||= {}; json.assist.ok = 'Ideal';
      // localize new status keys
      json.status.scouting = 'Hintergrundinformationen werden abgerufen...';
      json.status.scoutReady = 'Hintergrundinformationen abgerufen.';
      json.status.scoutFailed = 'Abruf der Hintergrundinformationen fehlgeschlagen:';
      json.status.generating = 'Entwurf wird erstellt...';
      json.status.generateFailed = 'Entwurfserstellung fehlgeschlagen:';
      json.apikey = {
        label: 'API-Schlüssel', save: 'Speichern', saved: 'Gespeichert',
        savedMsg: 'API-Schlüssel im Browser gespeichert.', saveFailed: 'Speichern fehlgeschlagen.'
      };
    }
    if (code === 'fr') {
      if (json.guide) json.guide.title = 'Guide';
      json.status.title = 'Opérations';
      json.assist ||= {}; json.assist.ok = 'Optimale'; json.assist.long = 'Longue';
      json.status.scouting = 'Récupération des informations...';
      json.status.scoutReady = 'Informations récupérées.';
      json.status.scoutFailed = 'Échec de la récupération des informations :';
      json.status.generating = 'Génération du brouillon...';
      json.status.generateFailed = 'Échec de la génération du brouillon :';
      json.apikey = {
        label: 'Clé API', save: 'Enregistrer', saved: 'Enregistrée',
        savedMsg: 'Clé API enregistrée dans le navigateur.', saveFailed: 'Échec de l\'enregistrement.'
      };
    }
    if (code === 'it') {
      json.brand = 'Marchio';
      json.status.scouting = 'Recupero delle informazioni...';
      json.status.scoutReady = 'Informazioni recuperate.';
      json.status.scoutFailed = 'Recupero delle informazioni non riuscito:';
      json.status.generating = 'Generazione della bozza...';
      json.status.generateFailed = 'Generazione della bozza non riuscita:';
      json.apikey = {
        label: 'Chiave API', save: 'Salva', saved: 'Salvata',
        savedMsg: 'Chiave API salvata nel browser.', saveFailed: 'Salvataggio non riuscito.'
      };
    }
    if (code === 'sv') {
      json.assist ||= {}; json.assist.ok = 'Optimalt';
      json.status.scouting = 'Hämtar bakgrundsinformation...';
      json.status.scoutReady = 'Bakgrundsinformation hämtad.';
      json.status.scoutFailed = 'Misslyckades att hämta bakgrundsinformation:';
      json.status.generating = 'Skapar utkast...';
      json.status.generateFailed = 'Misslyckades att skapa utkast:';
      json.apikey = {
        label: 'API-nyckel', save: 'Spara', saved: 'Sparad',
        savedMsg: 'API-nyckel sparad i webbläsaren.', saveFailed: 'Sparandet misslyckades.'
      };
    }
    if (code === 'et') {
      if (json.status && typeof json.status.ready === 'string') json.status.ready = 'Valmis';
    }

    save(p, json);
  }
  console.log('Filled missing i18n keys and applied targeted fixes.');
}

try { run(); } catch (e) { console.error(e); process.exit(1); }

