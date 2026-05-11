// frontend/src/components/FranceTravail/FranceTravailSearch.js
// Onglet "Offres France Travail" — recherche + scores rapides + matching IA approfondi
//
// Le backend (services/france_travail.py + routes/api/france_travail_api.py)
// expose /api/jobs/search, /api/jobs/{id}, /api/jobs/{id}/match.

import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiSearch, FiMapPin, FiBriefcase, FiClock, FiExternalLink,
  FiTarget, FiZap, FiX, FiInfo
} from 'react-icons/fi';
import './FranceTravailSearch.css';

const PUBLIEE_DEPUIS_CHOICES = [
  { value: '', label: 'Toutes périodes' },
  { value: '1', label: 'Hier' },
  { value: '3', label: '3 derniers jours' },
  { value: '7', label: '7 derniers jours' },
  { value: '14', label: '14 derniers jours' },
  { value: '31', label: '31 derniers jours' },
];

const CONTRAT_CHOICES = [
  { value: '', label: 'Tous contrats' },
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'MIS', label: 'Intérim' },
  { value: 'SAI', label: 'Saisonnier' },
  { value: 'FRA', label: 'Franchise' },
];

const scoreColor = (score) => {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 70) return '#16a34a';
  if (score >= 45) return '#d97706';
  return '#dc2626';
};

const scoreLabel = (score) => {
  if (score === null || score === undefined) return 'Score indisponible (chargez votre CV)';
  if (score >= 70) return 'Bonne couverture de vocabulaire';
  if (score >= 45) return 'Couverture partielle';
  return 'Vocabulaire éloigné';
};

const FranceTravailSearch = () => {
  const [filters, setFilters] = useState({
    motsCles: '',
    commune: '',
    distance: '',
    typeContrat: '',
    publieeDepuis: '',
    teletravail: false,
  });
  const [results, setResults] = useState([]);
  const [hasCv, setHasCv] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tookMs, setTookMs] = useState(null);

  const [selectedOffre, setSelectedOffre] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  const handleChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMatchResult(null);

    const body = {
      motsCles: filters.motsCles || undefined,
      commune: filters.commune || undefined,
      distance: filters.distance || undefined,
      typeContrat: filters.typeContrat || undefined,
      publieeDepuis: filters.publieeDepuis || undefined,
      range: '0-19',
      sort: 1, // 1 = tri par date côté FT, on re-trie par score localement après
    };

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        toast.error(data.error || 'Recherche France Travail impossible');
        setResults([]);
      } else {
        setResults(data.results || []);
        setHasCv(!!data.has_cv);
        setTookMs(data.took_ms);
        if ((data.results || []).length === 0) {
          toast('Aucune offre ne correspond à ces critères.', { icon: 'ℹ️' });
        }
      }
    } catch (err) {
      console.error('Recherche FT KO :', err);
      toast.error('Erreur réseau pendant la recherche');
      setResults([]);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }, [filters]);

  const openDetail = (offre) => {
    setSelectedOffre(offre);
    setMatchResult(null);
  };

  const closeDetail = () => {
    setSelectedOffre(null);
    setMatchResult(null);
  };

  const runDeepMatch = async () => {
    if (!selectedOffre) return;
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`/api/jobs/${selectedOffre.id}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ service_id: 'matching_cv_offre' }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setMatchResult(data.matching || data.analysis || data.result || data.content || data);
        toast.success('Matching IA terminé');
      } else {
        toast.error(data.error || 'Matching IA indisponible');
      }
    } catch (err) {
      console.error('Matching FT KO :', err);
      toast.error('Erreur réseau pendant le matching IA');
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div className="ft-search">
      <div className="ft-search-intro">
        <FiInfo />
        <div>
          <strong>Recherche en direct sur France Travail.</strong>{' '}
          Plus d'un million d'offres disponibles. Si votre CV est chargé, chaque
          résultat est annoté d'un score rapide de couverture du vocabulaire.
          Cliquez sur une offre pour lancer un matching IA approfondi.
        </div>
      </div>

      {/* Formulaire de recherche */}
      <form className="ft-form" onSubmit={handleSearch}>
        <div className="ft-form-grid">
          <label className="ft-field ft-field-wide">
            <span>Métier / mots-clés</span>
            <input
              type="text"
              placeholder="Ex : développeur python, infirmier, comptable…"
              value={filters.motsCles}
              onChange={handleChange('motsCles')}
            />
          </label>

          <label className="ft-field">
            <span>Lieu (code INSEE)</span>
            <input
              type="text"
              placeholder="Ex : 75056 (Paris)"
              value={filters.commune}
              onChange={handleChange('commune')}
            />
          </label>

          <label className="ft-field">
            <span>Distance (km)</span>
            <input
              type="number"
              min="0"
              max="200"
              placeholder="Ex : 20"
              value={filters.distance}
              onChange={handleChange('distance')}
            />
          </label>

          <label className="ft-field">
            <span>Type de contrat</span>
            <select value={filters.typeContrat} onChange={handleChange('typeContrat')}>
              {CONTRAT_CHOICES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="ft-field">
            <span>Publiée depuis</span>
            <select value={filters.publieeDepuis} onChange={handleChange('publieeDepuis')}>
              {PUBLIEE_DEPUIS_CHOICES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="ft-form-actions">
          <button type="submit" className="ft-btn ft-btn-primary" disabled={loading}>
            <FiSearch />
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
      </form>

      {/* Bandeau d'info CV */}
      {searched && !hasCv && (
        <div className="ft-warning">
          ⚠️ Votre CV n'est pas chargé : les scores de compatibilité n'apparaissent pas.
          Allez dans l'onglet "Mes documents" pour le déposer.
        </div>
      )}

      {/* Résultats */}
      {searched && (
        <div className="ft-results-header">
          <span>{results.length} offre{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}</span>
          {tookMs !== null && <span className="ft-results-meta">en {tookMs} ms</span>}
        </div>
      )}

      <div className="ft-results">
        {results.map((offre) => (
          <article key={offre.id} className="ft-card" onClick={() => openDetail(offre)}>
            <header className="ft-card-header">
              <h4>{offre.title || 'Offre sans titre'}</h4>
              {hasCv && (
                <span
                  className="ft-score"
                  style={{ background: scoreColor(offre.quick_score) }}
                  title={scoreLabel(offre.quick_score)}
                >
                  {offre.quick_score ?? '—'}
                </span>
              )}
            </header>
            <div className="ft-card-meta">
              {offre.company && <span><FiBriefcase /> {offre.company}</span>}
              {offre.location && <span><FiMapPin /> {offre.location}</span>}
              {offre.contract_type && <span><FiClock /> {offre.contract_type}</span>}
            </div>
            {offre.description && (
              <p className="ft-card-excerpt">
                {offre.description.substring(0, 220)}
                {offre.description.length > 220 ? '…' : ''}
              </p>
            )}
            <div className="ft-card-footer">
              <span className="ft-card-link">Voir le détail →</span>
            </div>
          </article>
        ))}
      </div>

      {/* Modal détail */}
      {selectedOffre && (
        <div className="ft-modal-overlay" onClick={closeDetail}>
          <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ft-modal-header">
              <div>
                <h3>{selectedOffre.title}</h3>
                <div className="ft-card-meta">
                  {selectedOffre.company && <span><FiBriefcase /> {selectedOffre.company}</span>}
                  {selectedOffre.location && <span><FiMapPin /> {selectedOffre.location}</span>}
                  {selectedOffre.contract_type && <span><FiClock /> {selectedOffre.contract_type}</span>}
                </div>
              </div>
              <button className="ft-modal-close" onClick={closeDetail} aria-label="Fermer">
                <FiX />
              </button>
            </div>

            <div className="ft-modal-body">
              {hasCv && (
                <div className="ft-modal-score" style={{ borderColor: scoreColor(selectedOffre.quick_score) }}>
                  <strong style={{ color: scoreColor(selectedOffre.quick_score) }}>
                    Score rapide : {selectedOffre.quick_score ?? '—'} / 100
                  </strong>
                  <div className="ft-modal-score-hint">{scoreLabel(selectedOffre.quick_score)}</div>
                </div>
              )}

              {selectedOffre.salary && (
                <p><strong>Rémunération :</strong> {selectedOffre.salary}</p>
              )}
              {selectedOffre.experience && (
                <p><strong>Expérience :</strong> {selectedOffre.experience}</p>
              )}
              {selectedOffre.rome_code && (
                <p>
                  <strong>Code ROME :</strong> {selectedOffre.rome_code}
                  {selectedOffre.rome_label ? ` — ${selectedOffre.rome_label}` : ''}
                </p>
              )}
              {selectedOffre.skills && selectedOffre.skills.length > 0 && (
                <div className="ft-skills">
                  {selectedOffre.skills.slice(0, 12).map((s, i) => (
                    <span key={i} className="ft-skill-chip">{s}</span>
                  ))}
                </div>
              )}

              <h4>Description</h4>
              <p className="ft-modal-description">
                {selectedOffre.description || 'Description indisponible.'}
              </p>

              {matchResult && (
                <div className="ft-match-result">
                  <h4>🎯 Matching IA approfondi</h4>
                  <pre>{typeof matchResult === 'string'
                    ? matchResult
                    : JSON.stringify(matchResult, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="ft-modal-footer">
              <button
                className="ft-btn ft-btn-secondary"
                onClick={runDeepMatch}
                disabled={matchLoading}
              >
                <FiZap />
                {matchLoading ? 'Analyse IA…' : 'Tester ma compatibilité IA'}
              </button>
              {selectedOffre.url_apply && (
                <a
                  className="ft-btn ft-btn-primary"
                  href={selectedOffre.url_apply}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FiExternalLink /> Postuler sur France Travail
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="ft-empty">
          <FiTarget />
          <p>Aucune offre pour ces critères. Essayez d'élargir la recherche.</p>
        </div>
      )}
    </div>
  );
};

export default FranceTravailSearch;
