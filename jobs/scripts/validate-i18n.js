#!/usr/bin/env node
/**
 * Validate i18n JSON files and ensure key parity with en.json.
 *
 * Usage:
 *   node scripts/validate-i18n.js            # validate all locales vs en.json
 *   node scripts/validate-i18n.js --exclude=fi,manifest
 *   node scripts/validate-i18n.js --only=de  # validate a single locale
 *   node scripts/validate-i18n.js --strict   # non-zero exit on extras too
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const I18N_DIR = path.join(ROOT, 'assets', 'i18n');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { exclude: new Set(['manifest']), only: null, strict: false };
  for (const a of args) {
    if (a.startsWith('--exclude=')) {
      const list = a.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
      list.forEach(l => opts.exclude.add(l.replace(/\.json$/i, '')));
    } else if (a.startsWith('--only=')) {
      opts.only = a.split('=')[1].trim().replace(/\.json$/i, '');
    } else if (a === '--strict') {
      opts.strict = true;
    }
  }
  return opts;
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      keys.push(full);
      keys.push(...flattenKeys(obj[k], full));
    }
  } else if (Array.isArray(obj)) {
    // If array items are objects, traverse them without indexing
    for (const item of obj) {
      keys.push(...flattenKeys(item, prefix));
    }
  }
  return keys;
}

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function main() {
  const opts = parseArgs();
  if (!fs.existsSync(I18N_DIR)) {
    console.error(`Not found: ${I18N_DIR}`);
    process.exit(2);
  }

  const refPath = path.join(I18N_DIR, 'en.json');
  const refParse = readJson(refPath);
  if (!refParse.ok) {
    console.error(`ERROR: Failed to parse en.json: ${refParse.error.message}`);
    process.exit(2);
  }
  const refKeys = new Set(flattenKeys(refParse.data));

  const files = fs.readdirSync(I18N_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => f.toLowerCase() !== 'en.json')
    .filter(f => !opts.exclude.has(f.replace(/\.json$/i, '')));

  let hadError = false;
  for (const file of files) {
    const locale = file.replace(/\.json$/i, '');
    if (opts.only && opts.only !== locale) continue;
    const full = path.join(I18N_DIR, file);
    const parsed = readJson(full);
    if (!parsed.ok) {
      console.error(`${file}: INVALID JSON -> ${parsed.error.message}`);
      hadError = true;
      continue;
    }

    const keys = new Set(flattenKeys(parsed.data));
    const missing = [...refKeys].filter(k => !keys.has(k));
    const extra = [...keys].filter(k => !refKeys.has(k));

    const statusParts = [];
    statusParts.push(`missing=${missing.length}`);
    statusParts.push(`extra=${extra.length}`);
    console.log(`${file}: ${statusParts.join(', ')}`);
    if (missing.length) {
      console.log('  Missing keys (first 30):');
      for (const k of missing.slice(0, 30)) console.log('   - ' + k);
      hadError = true;
    }
    if (extra.length) {
      console.log('  Extra keys (first 30):');
      for (const k of extra.slice(0, 30)) console.log('   - ' + k);
      if (opts.strict) hadError = true;
    }
  }

  process.exit(hadError ? 1 : 0);
}

if (require.main === module) {
  main();
}

