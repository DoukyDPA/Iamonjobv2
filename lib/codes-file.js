// ════════════════════════════════════════════════════════════════════════════
// Lecture du fichier des codes du conseiller (CSV ou Excel), dans le
// navigateur uniquement. Renvoie une table code → « Prénom Nom ».
//
// Le fichier ne quitte jamais l'ordinateur : il est lu ici, la table reste en
// mémoire (ou dans ce navigateur si le conseiller le demande). Le serveur ne
// connaît toujours que des codes.
// ════════════════════════════════════════════════════════════════════════════

import { readZipEntry } from './docx-read';
import { normalizeCode } from './beneficiaire-auth';

// CSV : séparateur « ; » (Excel français) ou « , », guillemets gérés.
function parseCsv(text) {
  const t = text.replace(/^﻿/, '');
  const firstLine = t.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const xmlText = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');

const colIndex = (ref) => {
  const letters = String(ref || '').replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

// Excel (.xlsx) : première feuille, chaînes partagées comprises.
async function parseXlsx(buf) {
  const dec = new TextDecoder();
  let shared = [];
  try {
    const ss = dec.decode(await readZipEntry(buf, 'xl/sharedStrings.xml'));
    shared = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
      xmlText([...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
  } catch { /* pas de chaînes partagées */ }
  const sheet = dec.decode(await readZipEntry(buf, 'xl/worksheets/sheet1.xml'));
  const rows = [];
  for (const r of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const inner = c[2] || '';
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1];
      const type = (attrs.match(/t="(\w+)"/) || [])[1];
      let v = '';
      if (type === 's') v = shared[Number((inner.match(/<v>(\d+)<\/v>/) || [])[1])] ?? '';
      else if (type === 'inlineStr') v = xmlText((inner.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/) || [])[1] || '');
      else v = xmlText((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '');
      row[ref ? colIndex(ref) : row.length] = v;
    }
    rows.push(Array.from(row, (x) => x ?? ''));
  }
  return rows;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * Lit le fichier et renvoie { map: { CODE: 'Prénom Nom' }, count }.
 * Colonnes reconnues par leur titre (Code, Prénom, Nom) ; à défaut, la
 * première colonne est le code et la deuxième le prénom.
 */
export async function readCodesFile(file) {
  const name = file.name.toLowerCase();
  let rows;
  if (name.endsWith('.xlsx')) rows = await parseXlsx(await file.arrayBuffer());
  else if (name.endsWith('.xls')) throw new Error('Ancien format Excel (.xls) : enregistrez le fichier en .xlsx ou .csv.');
  else rows = parseCsv(await file.text());

  rows = rows.filter((r) => r.some((c) => String(c).trim()));
  if (!rows.length) throw new Error('Le fichier est vide.');

  const head = rows[0].map(norm);
  let iCode = head.findIndex((h) => h.startsWith('code'));
  let iPrenom = head.findIndex((h) => h.startsWith('prenom'));
  let iNom = head.findIndex((h) => h.startsWith('nom'));
  let start = 1;
  if (iCode < 0) { iCode = 0; iPrenom = 1; iNom = -1; start = 0; }

  const map = {};
  for (const r of rows.slice(start)) {
    const code = normalizeCode(r[iCode]);
    if (!/^AC-\d{4}-\d{3,}/.test(code)) continue;
    const label = [iPrenom >= 0 ? r[iPrenom] : '', iNom >= 0 ? r[iNom] : '']
      .map((x) => String(x || '').trim()).filter(Boolean).join(' ');
    if (label) map[code] = label.slice(0, 80);
  }
  const count = Object.keys(map).length;
  if (!count) throw new Error("Aucun prénom trouvé. Vérifiez que la colonne « Prénom » est remplie à côté des codes.");
  return { map, count };
}
