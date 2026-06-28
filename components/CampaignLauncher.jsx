'use client';

// ════════════════════════════════════════════════════════════════════════════
// CampaignLauncher — Modal de création d'une campagne de candidatures spontanées
//
// Pipeline en 5 étapes affichées en temps réel :
//   1. Géocodage de la ville (API adresse.data.gouv.fr — gratuit, sans clé)
//   2. Recherche du code ROME (/api/rome)
//   3. Recherche d'entreprises La Bonne Boîte (/api/labonneboite)
//   4. Résolution des contacts (/api/contact-resolver)
//   5. Génération de la campagne (/api/campaign/generate)
//
// Props :
//   isOpen      — booléen d'affichage
//   onClose     — fermeture du modal
//   cvText      — texte du CV (depuis App.jsx)
//   selectedJob — métier sélectionné (depuis App.jsx)
//   userLocation — ville/dépt déjà connue (pré-remplissage)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  X, MapPin, Loader2, CheckCircle2, AlertCircle,
  Building2, Send, ChevronRight, Sliders,
} from 'lucide-react';
import { Button } from './ui';

// ─── Étapes du pipeline ───────────────────────────────────────────────────

const STEPS = [
  { id: 'geocode',  label: 'Localisation'              },
  { id: 'rome',     label: 'Code ROME'                  },
  { id: 'lbb',      label: 'Entreprises (La Bonne Boîte)' },
  { id: 'contacts', label: 'Résolution des contacts'   },
  { id: 'generate', label: 'Génération de la campagne' },
];

function StepRow({ step, status, detail }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 shrink-0 flex justify-center">
        {status === 'done'    && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        {status === 'active'  && <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />}
        {status === 'error'   && <AlertCircle className="w-5 h-5 text-rose-500" />}
        {status === 'pending' && <span className="w-2 h-2 rounded-full bg-cream-300 mx-auto" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${
          status === 'done'    ? 'text-emerald-700' :
          status === 'active'  ? 'text-teal-700'   :
          status === 'error'   ? 'text-rose-600'   :
          'text-slate-400'
        }`}>
          {step.label}
        </p>
        {detail && (
          <p className="text-xs text-teal-700/60 truncate mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function CampaignLauncher({ isOpen, onClose, cvText, selectedJob, userLocation = '' }) {
  const [city, setCity]     = useState(userLocation);
  const [radius, setRadius] = useState(30);
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [stepDetails, setStepDetails]   = useState({});
  const [error, setError]   = useState(null);
  const [campaignId, setCampaignId] = useState(null);

  if (!isOpen) return null;

  const setStep = (id, status, detail = '') => {
    setStepStatuses((prev) => ({ ...prev, [id]: status }));
    setStepDetails((prev)  => ({ ...prev, [id]: detail }));
  };

  // ── Pipeline ────────────────────────────────────────────────────────────

  const launch = async () => {
    if (!city.trim()) { setError('Entrez une ville.'); return; }
    if (!cvText)      { setError('CV introuvable.'); return; }
    if (!selectedJob) { setError('Aucun métier sélectionné.'); return; }

    setRunning(true);
    setError(null);
    setCampaignId(null);
    setStepStatuses({});
    setStepDetails({});

    try {
      // ── 1. Géocodage ─────────────────────────────────────────────────
      setStep('geocode', 'active');
      const geoRes = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&type=municipality&limit=1`
      );
      if (!geoRes.ok) throw new Error('Géocodage impossible.');
      const geoData = await geoRes.json();
      const feature = geoData.features?.[0];
      if (!feature) throw new Error(`Ville « ${city} » introuvable.`);
      const [longitude, latitude] = feature.geometry.coordinates;
      const cityLabel = feature.properties.label;
      setStep('geocode', 'done', `${cityLabel} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);

      // ── 2. Code ROME ─────────────────────────────────────────────────
      setStep('rome', 'active');
      const romeRes = await fetch('/api/rome', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ label: selectedJob, limit: 1 }),
      });
      const romeData = await romeRes.json();
      if (!romeRes.ok) throw new Error(romeData.error || 'Erreur ROME.');
      const codeRome = romeData.metiers?.[0]?.codeRome;
      if (!codeRome) throw new Error(`Aucun code ROME trouvé pour « ${selectedJob} ».`);
      setStep('rome', 'done', `${codeRome} — ${romeData.metiers[0].libelle}`);

      // ── 3. La Bonne Boîte ────────────────────────────────────────────
      setStep('lbb', 'active');
      const lbbRes = await fetch('/api/labonneboite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ romeCode: codeRome, latitude, longitude, distance: radius, pageSize: 20 }),
      });
      const lbbData = await lbbRes.json();
      if (!lbbRes.ok) throw new Error(lbbData.error || 'Erreur La Bonne Boîte.');
      const companies = lbbData.companies || [];
      if (companies.length === 0) throw new Error('Aucune entreprise trouvée dans ce secteur. Essayez un rayon plus large.');
      setStep('lbb', 'done', `${companies.length} entreprise${companies.length > 1 ? 's' : ''} trouvée${companies.length > 1 ? 's' : ''}`);

      // ── 4. Résolution des contacts ───────────────────────────────────
      setStep('contacts', 'active');
      const batch = companies.slice(0, 30);
      const crRes = await fetch('/api/contact-resolver', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companies: batch }),
      });
      const crData = await crRes.json();
      if (!crRes.ok) throw new Error(crData.error || 'Erreur résolution contacts.');
      const resolved = crData.resolved || crData.companies || batch;
      const withEmail = resolved.filter((c) => c.email).length;
      setStep('contacts', 'done', `${withEmail} email${withEmail > 1 ? 's' : ''} résolu${withEmail > 1 ? 's' : ''} sur ${resolved.length}`);

      // ── 5. Génération de la campagne ─────────────────────────────────
      setStep('generate', 'active');
      const genRes = await fetch('/api/campaign/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cvText, jobTitle: selectedJob, codeRome, companies: resolved }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Erreur génération campagne.');
      setStep('generate', 'done', `Campagne créée (${resolved.length} entreprises)`);
      setCampaignId(genData.campaignId);

    } catch (err) {
      // Marque l'étape active en erreur
      const active = STEPS.find((s) => stepStatuses[s.id] === 'active')?.id;
      if (active) setStep(active, 'error', err.message);
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setRunning(false);
    setStepStatuses({});
    setStepDetails({});
    setError(null);
    setCampaignId(null);
    setCity(userLocation);
    setRadius(30);
  };

  const allDone = campaignId !== null;

  // ── Rendu ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50 animate-fade-in"
      onClick={() => { if (!running) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-6 py-5 border-b border-cream-200 bg-cream-50/60 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-teal-800 flex items-center gap-2">
              <Send className="w-5 h-5 text-teal-600" />
              Créer une campagne spontanée
            </h2>
            <p className="text-xs text-teal-700/60 mt-0.5">
              Métier ciblé : <strong>{selectedJob}</strong>
            </p>
          </div>
          {!running && (
            <button onClick={onClose} className="text-teal-700/50 hover:text-teal-900 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Formulaire — masqué pendant / après l'exécution */}
          {!running && !allDone && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5">
                  Ville de recherche
                </label>
                <div className="flex items-center gap-2 border border-cream-200 rounded-xl px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-teal-400">
                  <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && launch()}
                    placeholder="Lyon, Paris, Bordeaux…"
                    className="flex-1 text-sm outline-none bg-transparent placeholder:text-teal-700/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Rayon de recherche : <span className="text-teal-700">{radius} km</span>
                </label>
                <input
                  type="range"
                  min={10} max={100} step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-xs text-teal-700/40 mt-1">
                  <span>10 km</span><span>100 km</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button onClick={launch} className="w-full" icon={Send}>
                Lancer la campagne
              </Button>
            </div>
          )}

          {/* Pipeline en cours */}
          {(running || Object.keys(stepStatuses).length > 0) && !allDone && (
            <div className="space-y-1 divide-y divide-cream-100">
              {STEPS.map((s) => (
                <StepRow
                  key={s.id}
                  step={s}
                  status={stepStatuses[s.id] || 'pending'}
                  detail={stepDetails[s.id]}
                />
              ))}
              {error && (
                <div className="pt-3 flex items-start gap-2 text-sm text-rose-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Succès */}
          {allDone && (
            <div className="space-y-4">
              <div className="space-y-1 divide-y divide-cream-100">
                {STEPS.map((s) => (
                  <StepRow
                    key={s.id}
                    step={s}
                    status={stepStatuses[s.id] || 'done'}
                    detail={stepDetails[s.id]}
                  />
                ))}
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 space-y-3">
                <p className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Campagne générée avec succès !
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href={`/campagne/${campaignId}`}
                    className="inline-flex items-center justify-center gap-2 bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
                  >
                    Ouvrir la campagne
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <button
                    onClick={reset}
                    className="text-xs text-teal-600 hover:underline"
                  >
                    Créer une autre campagne
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
