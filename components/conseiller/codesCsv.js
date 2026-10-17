// ════════════════════════════════════════════════════════════════════════════
// Fichier des codes — téléchargé par le conseiller, gardé sur son ordinateur.
//
// Iamonjob ne connaît que des codes. Pour s'y retrouver, le conseiller remplit
// lui-même la colonne Prénom dans ce fichier, qui ne revient JAMAIS dans
// l'application : c'est sa table de correspondance, locale et privée.
//
// CSV séparé par des points-virgules avec BOM : s'ouvre proprement dans Excel
// et LibreOffice en français.
// ════════════════════════════════════════════════════════════════════════════

const cell = (v) => {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function formatDay(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString('fr-FR'); } catch { return ''; }
}

export function downloadCodesCsv(beneficiaires, { suffix = '' } = {}) {
  const rows = [
    ['Code', 'Prénom (à compléter)', 'Nom (facultatif)', 'Promo', 'Statut de la promo', 'Accès', 'Créé le', 'Notes'],
    ...beneficiaires.map((b) => [
      b.code,
      '',
      '',
      b.promo || '',
      b.promo ? (b.promoArchivee ? 'Archivée' : 'En cours') : '',
      b.status === 'active' ? 'Activé' : 'Code non activé',
      formatDay(b.createdAt),
      '',
    ]),
  ];
  const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  const safe = suffix ? `-${suffix.replace(/[^a-zA-Z0-9+-]+/g, '-').replace(/^-|-$/g, '')}` : '';
  a.href = url;
  a.download = `iamonjob-codes${safe}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
