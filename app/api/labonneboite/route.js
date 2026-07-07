import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getLaBonneBoite } from '@/lib/france-travail';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LBB_PER_MINUTE = parseInt(process.env.LBB_RATE_PER_MINUTE || '5', 10);
const LBB_PER_DAY    = parseInt(process.env.LBB_RATE_PER_DAY    || '50', 10);

export async function POST(request) {
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

  const rate = await enforceRateLimit({
    uid,
    route: 'labonneboite',
    perMinute: LBB_PER_MINUTE,
    perDay: LBB_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien de ciblage atteint. Réessayez demain.'
            : 'Trop de requêtes. Patientez un instant.',
      },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter || 60) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const {
    romeCode, citycode, postcode, departmentNumber, city, region,
    distance, nafCodes, headcount, contract, page, pageSize,
  } = body;

  const hasLocation = citycode || postcode || departmentNumber || city || region;
  if (!romeCode || !hasLocation) {
    return NextResponse.json(
      { error: 'Les champs romeCode et une localisation (citycode, postcode, departmentNumber, city ou region) sont requis.' },
      { status: 400 }
    );
  }

  // Mode mock local (LBB_MOCK_MODE=true dans .env.local) pour tester le pipeline
  // sans attendre la résolution du problème de scope France Travail
  if (process.env.LBB_MOCK_MODE === 'true') {
    const mockCompanies = Array.from({ length: Math.min(pageSize || 10, 8) }, (_, i) => ({
      siret: `1234567890${String(i).padStart(5, '0')}`,
      name: `Entreprise Test ${i + 1}`,
      naf: '7022Z', nafText: 'Conseil pour les affaires et autres conseils de gestion',
      address: '', city: 'Paris', zipcode: '75001',
      latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
      longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
      headcountText: '10–19 salariés',
      stars: Math.round(Math.random() * 5 * 10) / 10,
      url: null, website: null,
    }));
    return NextResponse.json({ total: mockCompanies.length, companies: mockCompanies });
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const result = await getLaBonneBoite({
      romeCode, citycode, postcode, departmentNumber, city, region,
      distance, nafCodes, headcount, contract, page, pageSize,
    });
    logEvent({
      event: 'labonneboite', requestId, uid, status: 'ok',
      resultCount: result.companies.length, total: result.total,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(result);
  } catch (err) {
    logEvent({
      event: 'labonneboite', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur La Bonne Boîte.' },
      { status: 500 }
    );
  }
}
