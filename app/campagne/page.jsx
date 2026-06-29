'use client';

// ════════════════════════════════════════════════════════════════════════════
// Page "Mes candidatures" — liste unifiée :
//   • Campagnes spontanées  → accent teal  (type: 'spontanee')
//   • Candidatures FT       → accent amber (type: 'france_travail')
// Route : /campagne
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  Loader2, Send, Clock, Building2,
  ChevronRight, AlertCircle, Plus, Trash2, X, Briefcase, Star,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

// ─── Config statuts campagnes spontanées ─────────────────────────────────

const CAMPAIGN_STATUS = {
  draft:              { label: 'Brouillon',             variant: 'gray' },
  pending_validation: { label: 'Validée',               variant: 'emerald' },
  validated:          { label: 'Validée',               variant: 'emerald' },
  sending:            { label: 'Candidatures envoyées', variant: 'teal' },
  done:               { label: 'Candidatures envoyées', variant: 'teal' },
};

// ─── Config statuts candidatures FT ──────────────────────────────────────

const FT_STATUS = {
  saved:      { label: 'Analysée',  variant: 'amber' },
  applying:   { label: 'En cours',  variant: 'amber' },
  sent:       { label: 'Envoyée',   variant: 'emerald' },
  rejected:   { label: 'Refus',     variant: 'rose' },
  interview:  { label: 'Entretien', variant: 'teal' },
};

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export default function CampaignListPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState(null); // 'campaign' | 'ft'
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.push('/login'); return; }
      const token = await firebaseUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    setIsLoading(true);
    Promise.all([
      fetch('/api/campaign/list').then((r) => r.ok ? r.json() : Promise.reject()),
      fetch('/api/candidature').then((r) => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([campData, candData]) => {
        setCampaigns(campData.campaigns || []);
        setCandidatures(candData.candidatures || []);
      })
      .catch(() => setError('Erreur lors du chargement des candidatures.'))
      .finally(() => setIsLoading(false));
  }, [authReady]);

  const handleDelete = async (id, type) => {
    setIsDeleting(true);
    setError(null);
    const url = type === 'campaign' ? `/api/campaign/${id}` : `/api/candidature/${id}`;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      if (type === 'campaign') setCampaigns((prev) => prev.filter((c) => c.id !== id));
      else setCandidatures((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
      setConfirmDeleteType(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!authReady || isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const hasAnything = campaigns.length > 0 || candidatures.length > 0;

  // Fusionner et trier par date desc
  const allItems = [
    ...campaigns.map((c) => ({ ...c, _type: 'campaign' })),
    ...candidatures.map((c) => ({ ...c, _type: 'ft' })),
  ].sort((a, b) => {
    const ta = a.createdAt?._seconds ?? 0;
    const tb = b.createdAt?._seconds ?? 0;
    return tb - ta;
  });

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-white border-b border-cream-200 shadow-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-teal-600" />
            Mes candidatures
          </h1>
          <Button variant="secondary" onClick={() => router.push('/')} size="sm">
            Retour à l'accueil
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Légende */}
        {hasAnything && (
          <div className="flex flex-wrap gap-3 mb-5 text-xs text-teal-700/70">
            <span className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-teal-600" />
              Campagne spontanée
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              Réponse à une offre France Travail
            </span>
          </div>
        )}

        {!hasAnything ? (
          <Card className="p-12 flex flex-col items-center text-center gap-4">
            <Send className="w-10 h-10 text-teal-300" />
            <h2 className="text-teal-800 font-semibold">Aucune candidature pour l'instant</h2>
            <p className="text-sm text-teal-700/70 max-w-xs">
              Lancez une campagne spontanée ou analysez votre compatibilité avec une offre France Travail.
            </p>
            <Button onClick={() => router.push('/')} icon={Plus}>
              Retour à l'accueil
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {allItems.map((item) => {
              const isCampaign = item._type === 'campaign';
              const isConfirming = confirmDeleteId === item.id;

              if (isCampaign) {
                // ── Campagne spontanée ── accent teal
                const cfg = CAMPAIGN_STATUS[item.status] || CAMPAIGN_STATUS.draft;
                const keepCount = (item.companies || []).filter((co) => co.decision === 'keep').length;
                return (
                  <Card
                    key={`c-${item.id}`}
                    className={`px-5 py-4 flex items-center gap-4 transition-all border-l-4 border-l-teal-500 ${
                      isConfirming ? 'border-rose-300 bg-rose-50' : 'hover:shadow-card cursor-pointer'
                    }`}
                    onClick={() => !isConfirming && router.push(`/campagne/${item.id}`)}
                  >
                    <Send className="w-4 h-4 text-teal-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-teal-800 truncate">{item.jobTitle}</span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-teal-700/60">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {(item.companies || []).length} entreprises · {keepCount} retenue{keepCount > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                    {isConfirming ? (
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-rose-700 font-medium hidden sm:inline">Supprimer ?</span>
                        <button
                          onClick={() => handleDelete(item.id, 'campaign')}
                          disabled={isDeleting}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmer'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setConfirmDeleteId(item.id); setConfirmDeleteType('campaign'); }}
                          className="p-2 rounded-lg text-teal-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-teal-400" />
                      </div>
                    )}
                  </Card>
                );
              } else {
                // ── Candidature France Travail ── accent amber
                const cfg = FT_STATUS[item.status] || FT_STATUS.saved;
                return (
                  <Card
                    key={`ft-${item.id}`}
                    className={`px-5 py-4 flex items-center gap-4 transition-all border-l-4 border-l-amber-400 ${
                      isConfirming ? 'border-rose-300 bg-rose-50' : 'hover:shadow-card cursor-pointer'
                    }`}
                    onClick={() => !isConfirming && router.push(`/candidature/${item.id}`)}
                  >
                    <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-teal-800 truncate">{item.offer?.intitule}</span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {item.compatibility?.score != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3" />
                            {item.compatibility.score}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-teal-700/60">
                        {item.offer?.entreprise && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {item.offer.entreprise}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                    {isConfirming ? (
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-rose-700 font-medium hidden sm:inline">Supprimer ?</span>
                        <button
                          onClick={() => handleDelete(item.id, 'ft')}
                          disabled={isDeleting}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmer'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setConfirmDeleteId(item.id); setConfirmDeleteType('ft'); }}
                          className="p-2 rounded-lg text-teal-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </Card>
                );
              }
            })}
          </div>
        )}
      </main>
    </div>
  );
}
