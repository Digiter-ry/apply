#!/usr/bin/env node
/* validate-i18n.js - Validate i18n JSON files against English canonical keys
   - Ensures all langs parse and have consistent structure
   - Flags values that are identical to English (or Finnish) in other languages
   - Exits non-zero on hard errors (parse/type/identity violations in strict mode)
*/

const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');

const I18N_DIR = path.join(process.cwd(), 'assets', 'i18n');

function listLangFiles(dir){
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json')
    .map(f => path.join(dir, f));
}

function readJson(p){
  try {
    const txt = fs.readFileSync(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    throw new Error(`${p}: JSON parse failed: ${e.message}`);
  }
}

function flatten(obj, prefix = ''){
  const out = {};
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const k = `${prefix}[${i}]`;
      if (v && typeof v === 'object') Object.assign(out, flatten(v, k));
      else out[k] = v;
    });
    return out;
  }
  Object.entries(obj || {}).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else if (Array.isArray(v)) {
      v.forEach((iv, i) => {
        const ak = `${key}[${i}]`;
        if (iv && typeof iv === 'object') Object.assign(out, flatten(iv, ak));
        else out[ak] = iv;
      });
    } else {
      out[key] = v;
    }
  });
  return out;
}

function main(){
  const files = listLangFiles(I18N_DIR);
  if (!files.length) {
    console.error('No i18n JSON files found in', I18N_DIR);
    process.exit(1);
  }
  const byCode = new Map();
  for (const p of files) {
    const code = path.basename(p, '.json');
    byCode.set(code, { path: p, json: readJson(p) });
  }
  if (!byCode.has('en')) {
    console.error('Missing canonical en.json');
    process.exit(1);
  }
  const en = byCode.get('en').json;
  const fi = byCode.get('fi')?.json || {};
  const flatEn = flatten(en);
  const flatFi = flatten(fi);

  let errors = 0; let warnings = 0;

  const EQUAL_PREFIXES = [
    'status.scouting', 'status.scoutReady', 'status.scoutFailed',
    'status.generating', 'status.generateFailed', 'apikey.'
  ];

  for (const [code, { path: p, json }] of byCode.entries()){
    // Structure checks
    const flat = flatten(json);
    for (const [k, vEn] of Object.entries(flatEn)){
      if (!(k in flat)) {
        console.warn(`[warn] ${code}: missing key ${k}`);
        warnings++;
        continue;
      }
      const v = flat[k];
      // Type consistency: both strings/arrays/non-objects
      const tEn = Array.isArray(vEn) ? 'array' : typeof vEn;
      const tV = Array.isArray(v) ? 'array' : typeof v;
      if (tEn !== tV) {
        console.error(`[error] ${code}: type mismatch at ${k} -> expected ${tEn}, got ${tV}`);
        errors++;
      }

      // Language identity checks (strings only)
      if (typeof v === 'string') {
        const skipEq = EQUAL_PREFIXES.some(pref => k === pref || k.startsWith(pref));
        const enVal = typeof vEn === 'string' ? vEn : null;
        const fiVal = typeof flatFi[k] === 'string' ? flatFi[k] : null;
        if (!skipEq && code !== 'en' && enVal && v.trim() === enVal.trim()) {
          console.error(`[error] ${code}: value equals English at ${k}`);
          errors++;
        }
        if (!skipEq && code !== 'fi' && fiVal && v.trim() === fiVal.trim()) {
          console.error(`[error] ${code}: value equals Finnish at ${k}`);
          errors++;
        }
      }
      // Arrays: check each element identity if strings
      if (Array.isArray(v) && Array.isArray(vEn)) {
        const len = Math.min(v.length, vEn.length);
        for (let i=0;i<len;i++){
          if (typeof v[i] === 'string' && typeof vEn[i] === 'string' && code !== 'en' && v[i].trim() === vEn[i].trim()){
            console.error(`[error] ${code}: element equals English at ${k}[${i}]`);
            errors++;
          }
          const fiEl = Array.isArray(flatFi[k]) ? flatFi[k][i] : null;
          if (typeof v[i] === 'string' && typeof fiEl === 'string' && code !== 'fi' && v[i].trim() === fiEl.trim()){
            console.error(`[error] ${code}: element equals Finnish at ${k}[${i}]`);
            errors++;
          }
        }
      }
    }

    // Extra keys warning
    for (const k of Object.keys(flat)){
      if (!(k in flatEn)) {
        console.warn(`[warn] ${code}: extra key not in en: ${k}`);
        warnings++;
      }
    }
  }

  const hasHard = errors > 0;
  console.log(`i18n validation: ${errors} error(s), ${warnings} warning(s)`);
  if (STRICT && hasHard) process.exit(2);
}

try { main(); } catch (e) { console.error(e.message || e); process.exit(1); }
