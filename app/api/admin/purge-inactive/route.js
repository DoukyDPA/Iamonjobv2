// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/admin/purge-inactive
//
// Purge les comptes utilisateurs inactifs depuis plus de INACTIVE_ACCOUNT_DAYS
// jours (défaut 30). Les conseillers sont toujours épargnés. Déclenchée par un
// ordonnanceur externe (Railway Cron, cron-job.org, GitHub Actions…) une fois
// par jour, jamais par le navigateur. Protégée par un secret d'en-tête.
//
// Appel type (une fois CRON_SECRET posé) :
//   curl -X POST https://<app>/api/admin/purge-inactive \
//     -H "x-cron-secret: $CRON_SECRET"
//
// Observation sans rien supprimer (compte ce qui partirait) :
//   curl -X POST "https://<app>/api/admin/purge-inactive?dryRun=1" \
//     -H "x-cron-secret: $CRON_SECRET"
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { purgeInactiveUsers } from '@/lib/purge-inactive';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const requestId = newRequestId();

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré.' }, { status: 503 });
  }
  if (request.headers.get('x-cron-secret') !== secret) {
    logEvent({ event: 'purge-inactive', requestId, status: 'forbidden', level: 'error' });
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  try {
    const summary = await purgeInactiveUsers({ requestId, dryRun });
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logEvent({
      event: 'purge-inactive', requestId, status: 'error',
      error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: 'La purge a échoué. Voir les logs serveur.' },
      { status: 500 }
    );
  }
}
