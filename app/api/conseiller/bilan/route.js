// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/bilan
//
// GET ?promo=…&du=AAAA-MM-JJ&au=AAAA-MM-JJ → tableur CSV (Excel, LibreOffice)
// pour rendre compte aux financeurs : une ligne par personne (code, promo,
// activation, candidatures, campagnes, situation à la sortie), puis un
// récapitulatif. Aucun nom, aucun texte de CV : des codes et des chiffres.
//
// Période : personnes accompagnées pendant la période, c'est-à-dire entrées
// avant la fin et pas sorties avant le début.
// Accès : rôle conseiller, ses propres dossiers.
// ════════════════════════════════════════════════════════════════════════════

import { requireRole } from '@/lib/session';
import { adminDb } from '@/lib/firebase/admin';
import { listBeneficiaires } from '@/lib/beneficiaires';
import { sortieLabel, SORTIES_POSITIVES, SITUATIONS_SORTIE } from '@/lib/sortie';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SENT = new Set(['sent', 'relaunched', 'interview', 'rejected']);
const cell = (v) => {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const day = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');
const parseDay = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? Date.parse(`${s}T00:00:00Z`) : null);

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
  const requestId = newRequestId();

  const url = new URL(request.url);
  const promo = url.searchParams.get('promo') || '';
  const du = parseDay(url.searchParams.get('du'));
  const au = parseDay(url.searchParams.get('au'));
  const auFin = au != null ? au + 24 * 3600 * 1000 - 1 : null;

  try {
    let list = await listBeneficiaires(uid, { keepAuthUid: true });
    if (promo === '__sans__') list = list.filter((b) => !b.promo);
    else if (promo) list = list.filter((b) => b.promo === promo);
    list = list.filter((b) => {
      const entree = b.activatedAt || b.createdAt || 0;
      const sortie = b.sortie?.date ? parseDay(b.sortie.date) : null;
      if (auFin != null && entree > auFin) return false;
      if (du != null && sortie != null && sortie < du) return false;
      return true;
    });

    // Compte des candidatures et campagnes, personne par personne.
    const rows = await Promise.all(list.map(async (b) => {
      const authUid = b.authUid;
      let cand = [], camp = [];
      if (authUid) {
        const [c, k] = await Promise.all([
          adminDb.collection('candidatures').where('uid', '==', authUid).limit(200).get(),
          adminDb.collection('campaigns').where('uid', '==', authUid).limit(50).get(),
        ]);
        cand = c.docs.map((d) => d.data());
        camp = k.docs.map((d) => d.data());
      }
      return {
        b,
        analysees: cand.length,
        envoyees: cand.filter((c) => SENT.has(c.status)).length,
        entretiens: cand.filter((c) => c.status === 'interview').length,
        campagnes: camp.length,
        retenues: camp.reduce((n, c) => n + (Array.isArray(c.companies) ? c.companies.filter((x) => x.decision === 'keep').length : 0), 0),
      };
    }));

    const head = ['Code', 'Promo', 'Code créé le', 'Accès activé le', 'Offres analysées', 'Candidatures envoyées', 'Entretiens obtenus', 'Campagnes spontanées', 'Entreprises retenues', 'Situation à la sortie', 'Date de sortie', 'Précision'];
    const lines = [head];
    for (const r of rows) {
      lines.push([
        r.b.code, r.b.promo || '', day(r.b.createdAt), r.b.status === 'invited' ? '' : day(r.b.activatedAt),
        r.analysees, r.envoyees, r.entretiens, r.campagnes, r.retenues,
        r.b.sortie ? sortieLabel(r.b.sortie.situation) : 'En cours', r.b.sortie?.date || '', r.b.sortie?.precision || '',
      ]);
    }

    // Récapitulatif.
    const n = rows.length;
    const actives = rows.filter((r) => r.b.status !== 'invited').length;
    const sorties = rows.filter((r) => r.b.sortie);
    const positives = sorties.filter((r) => SORTIES_POSITIVES.includes(r.b.sortie.situation)).length;
    const sum = (k) => rows.reduce((t, r) => t + r[k], 0);
    lines.push([], ['RÉCAPITULATIF'],
      ['Période', `${url.searchParams.get('du') || 'début'} au ${url.searchParams.get('au') || "aujourd'hui"}`],
      ['Promo', promo === '__sans__' ? 'Sans promo' : promo || 'Toutes'],
      ['Personnes accompagnées', n],
      ['Accès activés', actives],
      ['Offres analysées', sum('analysees')],
      ['Candidatures envoyées', sum('envoyees')],
      ['Entretiens obtenus', sum('entretiens')],
      ['Campagnes spontanées', sum('campagnes')],
      ['Personnes sorties', sorties.length],
      ['dont sorties positives (emploi, formation, création)', positives],
      ['Taux de sorties positives', sorties.length ? `${Math.round((positives / sorties.length) * 100)} %` : ''],
    );
    for (const s of SITUATIONS_SORTIE) {
      lines.push([`Sortie : ${s.label}`, sorties.filter((r) => r.b.sortie.situation === s.id).length]);
    }

    const csv = '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n');
    logEvent({ event: 'bilan-export', requestId, uid, status: 'ok', count: n });
    const fname = `bilan-iamonjob-${(promo && promo !== '__sans__' ? promo : 'toutes').replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    logEvent({ event: 'bilan-export', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return new Response(JSON.stringify({ error: 'Export impossible.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
