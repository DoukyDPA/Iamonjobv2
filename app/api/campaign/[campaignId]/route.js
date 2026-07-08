// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/campaign/[campaignId]
//
// GET    → lecture d'une campagne (vérification uid)
// PATCH  → mise à jour partielle : status, companies, emailTemplate, validationLog
// DELETE → suppression définitive (vérification uid)
//
// Règle métier clé :
//   - PATCH status:'validated'   → horodate validationLog.validatedAt côté serveur
//   - PATCH sur campagne validée → repasse automatiquement en 'pending_validation'
//     si le corps contient des companies ou emailTemplate modifiés.
//
// Accès : authentifié uniquement, cookie __session requis.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth, FieldValue } from '@/lib/firebase/admin';
import { getCampaignById, updateCampaign, deleteCampaign } from '@/lib/campaign';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Helpers d'auth communs ───────────────────────────────────────────────

async function authenticate(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) return { uid: null, error: 'Non authentifié.', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { uid: null, error: 'Session invalide.', status: 401 };
  }
}

// ─── GET /api/campaign/[campaignId] ──────────────────────────────────────

export async function GET(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { campaignId } = await params;
  const requestId = newRequestId();

  try {
    const campaign = await getCampaignById(campaignId, uid);
    if (!campaign) {
      return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
    }
    logEvent({ event: 'campaign-get', requestId, uid, status: 'ok', campaignId });
    return NextResponse.json({ campaign });
  } catch (err) {
    logEvent({
      event: 'campaign-get', requestId, uid, status: 'error',
      campaignId, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur récupération campagne.' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/campaign/[campaignId] ────────────────────────────────────

// Champs autorisés depuis le client
const PATCHABLE = ['status', 'companies', 'emailTemplate', 'validationLog', 'notes'];

// Statuts autorisés pour un passage manuel
const VALID_STATUSES = ['draft', 'pending_validation', 'validated'];

export async function PATCH(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { campaignId } = await params;

  // ── 1. Vérification d'appartenance ────────────────────────────────────
  let existing;
  try {
    existing = await getCampaignById(campaignId, uid);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lecture campagne.' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
  }

  // ── 2. Parsing du body ────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  // ── 3. Filtrage des champs autorisés ──────────────────────────────────
  const updates = {};
  for (const key of PATCHABLE) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  // Notes personnelles de suivi : simple texte, plafonné.
  if (updates.notes !== undefined) updates.notes = String(updates.notes).slice(0, 4000);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ modifiable fourni.' }, { status: 400 });
  }

  // ── 4. Validation du statut ───────────────────────────────────────────
  if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
    return NextResponse.json(
      { error: `Statut invalide : ${updates.status}.` },
      { status: 400 }
    );
  }

  // ── 5. Règles métier sur le statut ────────────────────────────────────

  // Passage à 'validated' → on horodate côté serveur, sans faire confiance
  // à l'horodatage du client.
  if (updates.status === 'validated') {
    // Vérification : au moins une entreprise gardée
    const companies = updates.companies ?? existing.companies ?? [];
    const hasKeep = companies.some((c) => c.decision === 'keep');
    if (!hasKeep) {
      return NextResponse.json(
        { error: 'Au moins une entreprise doit être marquée « Garder » pour valider.' },
        { status: 422 }
      );
    }

    // Horodatage serveur fiable
    updates.validationLog = {
      ...(existing.validationLog || {}),
      ...(updates.validationLog || {}),
      validatedAt: FieldValue.serverTimestamp(),
      validatedBy: uid,
    };
  }

  // Modification de companies ou emailTemplate sur une campagne validée
  // → on repasse en pending_validation pour forcer une re-validation.
  if (
    existing.status === 'validated' &&
    updates.status === undefined &&
    (updates.companies !== undefined || updates.emailTemplate !== undefined)
  ) {
    updates.status = 'pending_validation';
    // On efface la date de validation précédente pour cohérence.
    updates.validationLog = {
      ...(existing.validationLog || {}),
      validatedAt: null,
      validatedBy: null,
    };
  }

  // ── 6. Persistance ────────────────────────────────────────────────────
  const requestId = newRequestId();
  try {
    await updateCampaign(campaignId, updates);
    logEvent({
      event: 'campaign-update', requestId, uid, status: 'ok',
      campaignId, newStatus: updates.status,
    });
    return NextResponse.json({ ok: true, newStatus: updates.status ?? existing.status });
  } catch (err) {
    logEvent({
      event: 'campaign-update', requestId, uid, status: 'error',
      campaignId, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur mise à jour campagne.' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/campaign/[campaignId] ───────────────────────────────────

export async function DELETE(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { campaignId } = await params;
  const requestId = newRequestId();

  // Vérification d'appartenance
  let existing;
  try {
    existing = await getCampaignById(campaignId, uid);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lecture campagne.' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
  }

  try {
    await deleteCampaign(campaignId);
    logEvent({ event: 'campaign-delete', requestId, uid, status: 'ok', campaignId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({
      event: 'campaign-delete', requestId, uid, status: 'error',
      campaignId, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur suppression campagne.' },
      { status: 500 }
    );
  }
}
