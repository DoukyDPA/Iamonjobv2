import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getCampaigns } from '@/lib/campaign';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  const requestId = newRequestId();
  try {
    const campaigns = await getCampaigns(uid);
    logEvent({ event: 'campaign-list', requestId, uid, status: 'ok', count: campaigns.length });
    return NextResponse.json({ campaigns });
  } catch (err) {
    logEvent({ event: 'campaign-list', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur récupération campagnes.' }, { status: 500 });
  }
}
