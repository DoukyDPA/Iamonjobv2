'use client';

// ════════════════════════════════════════════════════════════════════════════
// Page de liste des campagnes de candidatures spontanées
// Route : /campagne
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  Loader2, Send, CheckCircle2, Clock, Building2,
  ChevronRight, AlertCircle, Plus,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

const STATUS_CONFIG = {
  draft:              { label: 'Brouillon',      variant: 'gray' },
  pending_validation: { label: 'En attente',     variant: 'amber' },
  validated:          { label: 'Validée',        variant: 'emerald' },
  sending:            { label: 'Envoi en cours', variant: 'teal' },
  done:               { label: 'Terminée',       variant: 'teal' },
};

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function CampaignListPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetch('/api/campaign/list')
      .then((r) => r.ok ? r.json() : r.json().then((e) => Promise.reject(e.error)))
      .then((data) => setCampaigns(data.campaigns || []))
      .catch((err) => setError(typeof err === 'string' ? err : 'Erreur chargement'))
      .finally(() => setIsLoading(false));
  }, [authReady]);

  if (!authReady || isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-white border-b border-cream-200 shadow-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-teal-600" />
            Mes campagnes spontanées
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

        {campaigns.length === 0 ? (
          <Card className="p-12 flex flex-col items-center text-center gap-4">
            <Send className="w-10 h-10 text-teal-300" />
            <h2 className="text-teal-800 font-semibold">Aucune campagne pour l'instant</h2>
            <p className="text-sm text-teal-700/70 max-w-xs">
              Générez votre première campagne depuis l'espace principal en ciblant des entreprises via La Bonne Boîte.
            </p>
            <Button onClick={() => router.push('/')} icon={Plus}>
              Retour à l'accueil
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
              const keepCount = (c.companies || []).filter((co) => co.decision === 'keep').length;
              return (
                <Card
                  key={c.id}
                  className="px-5 py-4 flex items-center gap-4 hover:border-teal-300 hover:shadow-card transition-all cursor-pointer"
                  onClick={() => router.push(`/campagne/${c.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-teal-800 truncate">{c.jobTitle}</span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-teal-700/60">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {(c.companies || []).length} entreprises · {keepCount} retenue{keepCount > 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-400 shrink-0" />
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
