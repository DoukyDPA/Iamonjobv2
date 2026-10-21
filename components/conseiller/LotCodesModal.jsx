'use client';

// ════════════════════════════════════════════════════════════════════════════
// Créer une promo de codes d'un coup, puis imprimer un coupon par personne :
// son code, l'adresse du site et les 5 gestes pour activer son accès.
// Les coupons ne portent aucun nom : le conseiller écrit le prénom à la main
// s'il le souhaite, sur le papier, et complète son fichier des codes.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Loader2, Printer, Download, UsersRound } from 'lucide-react';
import { downloadCodesCsv } from './codesCsv';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function printCoupons(codes) {
  const host = window.location.host;
  const coupon = (code) => `
    <div class="c">
      <div class="h">IAMONJOB · votre accès personnel</div>
      <div class="lbl">Votre code</div>
      <div class="code">${esc(code)}</div>
      <ol>
        <li>Allez sur <b>${esc(host)}</b></li>
        <li>Touchez <b>« Activer mon code »</b> (sous le gros bouton « J'ai un code »)</li>
        <li>Tapez votre code (les tirets ne sont pas obligatoires)</li>
        <li>Choisissez un mot de passe d'au moins 8 caractères et notez-le ici :<br>
            <span class="line"></span></li>
        <li>Cochez la case d'accord, puis « Activer »</li>
      </ol>
      <div class="foot"><b>Connectez-vous au moins une fois par mois</b> : sans connexion pendant 30 jours, le compte et son contenu sont supprimés. Gardez ce papier. Mot de passe oublié ? Votre conseiller peut réinitialiser votre accès.</div>
    </div>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Coupons IAMONJOB</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #123F39; margin: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
    .c { border: 1.5px dashed #1E7A6B; border-radius: 4mm; padding: 5mm; break-inside: avoid; page-break-inside: avoid; }
    .h { font-size: 10pt; font-weight: bold; color: #1E7A6B; margin-bottom: 2mm; }
    .lbl { font-size: 9pt; }
    .code { font-family: "Courier New", monospace; font-size: 17pt; font-weight: bold; letter-spacing: 1px; margin: 1mm 0 3mm; }
    ol { margin: 0; padding-left: 5mm; font-size: 9.5pt; line-height: 1.45; }
    .line { display: inline-block; width: 60mm; border-bottom: 1px solid #999; height: 6mm; }
    .foot { margin-top: 3mm; font-size: 8pt; color: #555; }
    .no-print { padding: 10px; text-align: center; font-size: 12pt; }
    @media print { .no-print { display: none; } }
  </style></head><body>
  <div class="no-print">${codes.length} coupon(s) · <button onclick="window.print()">Imprimer</button></div>
  <div class="grid">${codes.map(coupon).join('')}</div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));<\/script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert("Le navigateur a bloqué la fenêtre d'impression. Autorisez les fenêtres pour ce site."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function LotCodesModal({ onClose, onCreated }) {
  const [count, setCount] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [codes, setCodes] = useState(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/conseiller/beneficiaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.codes?.length) setCodes(d.codes.map((c) => c.code));
      if (!r.ok || d.error) throw new Error(d.error || 'La création a échoué.');
      await onCreated?.();
    } catch (e) {
      setError(e.message);
      await onCreated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50" role="dialog" aria-modal="true" aria-labelledby="lot-title" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-lg bg-white border border-cream-200 rounded-2xl shadow-card p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <UsersRound className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 id="lot-title" className="text-lg font-bold text-teal-800">Créer une promo de codes</h2>
            <p className="text-sm text-teal-700/80 mt-1">Un code par personne, puis une page à imprimer avec un coupon pour chacune.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"><X className="w-5 h-5" /></button>
        </div>

        {!codes ? (
          <div className="mt-5">
            <label className="block text-sm font-semibold text-teal-800" htmlFor="lot-count">Nombre de personnes</label>
            <input id="lot-count" type="number" min={2} max={30} value={count} onChange={(e) => setCount(Math.max(2, Math.min(30, Number(e.target.value) || 2)))} className="mt-1 w-28 p-2.5 text-sm rounded-lg border border-teal-200" />
            <p className="text-xs text-teal-700/70 mt-1">De 2 à 30. Vous rattacherez ensuite ces codes à une promo dans l'onglet Promos.</p>
            {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border border-cream-200 text-teal-700 font-semibold hover:bg-cream-50">Annuler</button>
              <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:bg-teal-200">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Créer {count} codes
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            {error && <p className="text-sm text-amber-700 mb-2">{error}</p>}
            <p className="text-sm text-teal-800 font-semibold">{codes.length} codes créés :</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm text-teal-900">
              {codes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={() => downloadCodesCsv(codes.map((code) => ({ code, status: 'invited', createdAt: Date.now() })), { suffix: 'nouvelle-promo' })} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-800 font-semibold text-sm hover:bg-teal-50">
                <Download className="w-4 h-4" /> Fichier des codes
              </button>
              <button onClick={() => printCoupons(codes)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700">
                <Printer className="w-4 h-4" /> Imprimer les coupons
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
