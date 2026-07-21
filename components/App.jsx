'use client';

import { useState, useRef, useEffect } from 'react';
import {
  FileText, Search, Briefcase, CheckCircle, Target, TrendingUp,
  ChevronRight, ChevronLeft, Loader2, Upload, AlertCircle, ExternalLink,
  BrainCircuit, MapPin, Building2, PenTool, MessageSquare,
  Send, BookOpen, Clock, ThumbsUp, ThumbsDown,
  Info, Compass, Star, MessageCircle, RefreshCw,
  Gauge, X, Mail, Phone, Scissors, EyeOff,
} from 'lucide-react';
import {
  Button, Card, Badge, DifficultyBadge, getScoreColor,
  HelpTip, PrivacyBanner, FilePreview, StepFooter, GuidedIntro,
} from './ui';
import { BrandArrow, CatMascot, SectionTitle } from './brand';
import AppShell from './layout/AppShell';
import CampaignLauncher from './CampaignLauncher';
import {
  saveCvToFirestore,
  getCvFromFirestore,
  saveCvRatingToFirestore,
  clearCvRatingInFirestore,
  saveFavoriteJobsToFirestore,
} from '@/lib/firebase/client';
import AvisConseiller from './AvisConseiller';
import CoverLetterText from './CoverLetterText';

const MAX_CHAT_MESSAGES = 30;
const CHAT_HISTORY_WINDOW = 10;

// Le chat s'affiche en texte brut : on retire le markdown que le modèle glisse
// parfois (astérisques d'emphase, titres #, backticks, chevrons de citation).
const stripMarkdown = (s) =>
  String(s ?? '')
    .replace(/\*\*/g, '')
    .replace(/[*`]/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .trim();

const loadPdfJs = async () => {
  if (typeof window === 'undefined') return null;
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const formatBytes = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatSessionDate = () => {
  try {
    return `session du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
  } catch { return ''; }
};

// Aplati une valeur IA en texte affichable. L'IA renvoie parfois un objet ou un
// tableau là où une phrase est attendue (ex. « risques » = { pression, ... }).
// Sans cela, React plante : « Objects are not valid as a React child ».
const asText = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(' · ');
  if (typeof v === 'object') {
    return Object.entries(v)
      .map(([k, val]) => {
        const t = asText(val);
        return t ? `${k} : ${t}` : k;
      })
      .join(' · ');
  }
  return String(v);
};

export default function App({ user, availableProviders = ['mistral'] }) {
  const [step, setStep] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState(1);
  const [cvText, setCvText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Une ville nommée donne de meilleurs résultats qu'un code département sur les
  // API d'offres. Défaut « Créteil » ; on ne l'écrase que par une vraie ville
  // (voir analyzeCV), pas par un code département nu type « 11 ».
  const [userLocation, setUserLocation] = useState('Créteil');
  const [provider, setProvider] = useState(availableProviders[0] || 'mistral');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_provider');
      if (saved && availableProviders.includes(saved)) setProvider(saved);
    } catch {}
  }, [availableProviders]);

  useEffect(() => {
    getCvFromFirestore(user.id).then((data) => {
      if (data?.cvText) {
        setCvText(data.cvText);
        // CV déjà enregistré : on rend l'édition/anonymisation accessible d'emblée,
        // même sans réimport (le nom du fichier, lui, n'est pas conservé).
        setShowCvEditor(true);
        if (data.analysis) setSavedSession(data.analysis);
        // Restauration de la note précédente si elle correspond toujours
        // au CV en base (elle est nettoyée côté Firestore dès que le CV change).
        if (data.rating && typeof data.rating.score === 'number') {
          setCvRating(data.rating);
        }
      }
      // Métiers mis de côté lors des visites précédentes.
      if (Array.isArray(data?.favoriteJobs)) setFavoriteJobs(data.favoriteJobs);
    });
  }, [user.id]);

  // Métiers cochés par la personne, réaffichés dans la colonne de gauche.
  const [favoriteJobs, setFavoriteJobs] = useState([]);

  const isFavorite = (title) =>
    favoriteJobs.some((f) => f.title === title);

  // Ajoute ou retire un métier des favoris, puis persiste la liste.
  const toggleFavorite = (job) => {
    if (!job?.title) return;
    setFavoriteJobs((prev) => {
      const exists = prev.some((f) => f.title === job.title);
      const next = exists
        ? prev.filter((f) => f.title !== job.title)
        : [...prev, { title: job.title, codeRome: job.codeRome ?? null }];
      saveFavoriteJobsToFirestore(user.id, next);
      return next;
    });
  };

  // ── Métiers explorés (comparaison) ───────────────────────────────────────
  // Chaque enquête métier ouverte est mémorisée dans le navigateur : la personne
  // peut rouvrir une fiche déjà consultée sans la régénérer, et comparer plusieurs
  // métiers sans que l'un efface l'autre. Stocké en localStorage (par utilisateur),
  // donc conservé même après un rechargement de page. Rien n'est écrit en base.
  const MAX_DISCOVERED = 12;
  const [discoveredJobs, setDiscoveredJobs] = useState([]);
  const [activeJobKey, setActiveJobKey] = useState(null);
  // Copie à jour de la clé active, lisible dans les callbacks asynchrones : elle
  // sert à ne pas écraser la fiche affichée si l'utilisateur change d'onglet
  // pendant qu'une génération est encore en cours.
  const activeJobKeyRef = useRef(null);
  useEffect(() => { activeJobKeyRef.current = activeJobKey; }, [activeJobKey]);

  const jobKey = (title, codeRome) =>
    (codeRome || String(title || '')).toLowerCase().replace(/\s+/g, ' ').trim();

  // Écrit un correctif dans l'entrée mémorisée d'un métier, repéré par sa clé
  // (indépendamment du métier actuellement affiché).
  const patchDiscovered = (key, patch) => {
    setDiscoveredJobs((prev) => {
      const idx = prev.findIndex((j) => j.key === key);
      if (idx === -1) return prev;
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  // Chargement des fiches mémorisées au montage (clé propre à l'utilisateur).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`iamj_discovered_${user.id}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setDiscoveredJobs(arr);
      }
    } catch { /* localStorage indisponible : on continue sans mémoire */ }
  }, [user.id]);

  // Sauvegarde à chaque changement (on a déjà lu la valeur stockée au montage).
  useEffect(() => {
    try {
      localStorage.setItem(`iamj_discovered_${user.id}`, JSON.stringify(discoveredJobs));
    } catch { /* quota ou mode privé : on ignore */ }
  }, [discoveredJobs, user.id]);

  // Rouvre une fiche mémorisée : restaure rapport, salaire, ROME et conversation.
  const activateDiscovered = (entry) => {
    if (!entry) return;
    setActiveJobKey(entry.key);
    setSelectedJob(entry.title);
    setSearchKeywords(entry.title);
    setSelectedRome(
      entry.rome || (entry.codeRome ? { codeRome: entry.codeRome, libelle: entry.title } : null)
    );
    setJobReport(entry.report || null);
    setSalaryStats(entry.salaryStats || null);
    setChatHistory(Array.isArray(entry.chatHistory) ? entry.chatHistory : []);
    // Fiche pas encore prête (génération encore en cours) : on garde le chargement.
    setIsGeneratingReport(!entry.report);
    setError(null);
  };

  // Ferme un onglet métier. Si c'était l'onglet actif, on bascule sur un autre.
  const removeDiscovered = (key) => {
    const next = discoveredJobs.filter((j) => j.key !== key);
    setDiscoveredJobs(next);
    if (key === activeJobKey) {
      if (next.length > 0) {
        activateDiscovered(next[next.length - 1]);
      } else {
        setActiveJobKey(null);
        setSelectedJob(null);
        setJobReport(null);
        setSalaryStats(null);
        setSelectedRome(null);
        setChatHistory([]);
      }
    }
  };

  // Ouvre l'enquête métier d'un favori depuis la colonne de gauche.
  const openFavorite = (job) => {
    if (job?.title) discoverJob(job.title, job.codeRome);
  };

  const resumeSession = () => {
    setAnalysis(savedSession);
    if (savedSession?.location) setUserLocation(savedSession.location);
    goToStep(2);
  };

  const goToStep = (n) => {
    setStep(n);
    setMaxUnlocked((m) => Math.max(m, n));
  };

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobReport, setJobReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // Salaire sourcé (Adzuna) : null tant qu'on n'a pas de donnée fiable,
  // on retombe alors sur l'estimation IA de la fiche métier.
  const [salaryStats, setSalaryStats] = useState(null);
  // Code ROME du métier sélectionné, résolu une fois via ROMEO et partagé
  // aux offres et aux entreprises : la clé unique du métier ciblé.
  const [selectedRome, setSelectedRome] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingOffers, setIsSearchingOffers] = useState(false);
  const [searchKeywords, setSearchKeywords] = useState('');

  const [compatibility, setCompatibility] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);

  const [coverLetter, setCoverLetter] = useState(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [interviewPrep, setInterviewPrep] = useState(null);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);

  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [filePages, setFilePages] = useState(0);
  // true quand le texte vient de l'OCR vision (PDF graphique non lisible par pdf.js)
  const [ocrUsed, setOcrUsed] = useState(false);
  const [savedSession, setSavedSession] = useState(null);
  const [showCvEditor, setShowCvEditor] = useState(false);
  const [anonymizeWords, setAnonymizeWords] = useState('');
  // Deux façons de fournir son CV : import PDF ('upload') ou copier/coller ('paste').
  const [cvInputMode, setCvInputMode] = useState('upload');

  // Évaluation du CV (note /20 + critères détaillés)
  const [cvRating, setCvRating] = useState(null);
  const [isRatingCv, setIsRatingCv] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Modal campagne spontanée
  const [showCampaignLauncher, setShowCampaignLauncher] = useState(false);

  // Le client ne construit plus d'instruction système : il choisit une ACTION
  // (gabarit de confiance côté serveur) et fournit seulement des DONNÉES.
  const callAI = async (action, params = {}) => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, action, params }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur API (${res.status})`);
    }
    const data = await res.json();
    return data.result;
  };

  /**
   * Rend une page PDF en image base64 via un canvas hors-écran.
   * Utilisé en fallback quand l'extraction de texte échoue.
   */
  const renderPageToBase64 = async (page, scale = 1.5) => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    // Retire le préfixe "data:image/png;base64," — l'API n'attend que le base64 brut.
    return canvas.toDataURL('image/png').split(',')[1];
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Veuillez sélectionner un fichier PDF.'); return; }
    setIsExtractingPdf(true);
    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    // Tout nouveau CV ⇒ on réinitialise l'évaluation précédente (état + Firestore).
    setCvRating(null); setOcrUsed(false);
    clearCvRatingInFirestore(user.id);
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      setFilePages(pdf.numPages);

      // ── Tentative 1 : extraction de texte standard ────────────────────
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(' ') + '\n\n';
      }
      fullText = fullText.trim();

      // ── Tentative 2 : OCR vision si le texte extrait est trop court ───
      // Seuil de 200 caractères : en dessous, le PDF est probablement un rendu
      // graphique (Canva, Illustrator, scan) que pdf.js ne sait pas lire.
      if (fullText.length < 200) {
        const images = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const b64 = await renderPageToBase64(page);
          images.push({ data: b64, mimeType: 'image/png' });
        }
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur OCR.');
        }
        const { text } = await res.json();
        fullText = text.trim();
        setOcrUsed(true);
      }

      setCvText(fullText);
      // On ouvre d'emblée l'éditeur : la personne voit tout de suite qu'elle peut
      // retirer nom, e-mail, téléphone et corriger le texte avant l'analyse.
      setShowCvEditor(true);
    } catch (err) {
      setError('Erreur lors de la lecture du PDF. Le fichier est peut-être protégé ou illisible.');
    } finally {
      setIsExtractingPdf(false);
      e.target.value = null;
    }
  };

  const resetFile = () => {
    setFileName(''); setFileSize(0); setFilePages(0); setCvText(''); setShowCvEditor(false);
    setCvRating(null); setOcrUsed(false);
    clearCvRatingInFirestore(user.id);
  };

  /**
   * Évalue le CV : note sur 10 + détail par critères.
   * Le résultat reste affiché jusqu'à ce que l'utilisateur change son CV.
   */
  const rateCV = async () => {
    if (isRatingCv) return;
    // Pas de CV importé : on guide l'utilisateur vers l'étape 1 plutôt que de
    // rester silencieux. Le message s'affiche dans le bandeau d'erreur global.
    if (!cvText.trim()) {
      setError("Importez d'abord votre CV à l'étape 1 pour pouvoir l'évaluer.");
      setStep(1);
      return;
    }
    setIsRatingCv(true);
    setError(null);
    try {
      const result = await callAI('rate_cv', { cvText });
      if (result && typeof result.score === 'number') {
        setCvRating(result);
        // Persistance : la note survivra aux rechargements de page tant que
        // le CV n'aura pas été modifié.
        saveCvRatingToFirestore(user.id, cvText, result);
      } else {
        throw new Error('Réponse inattendue de l\'IA.');
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'évaluation du CV.");
    } finally {
      setIsRatingCv(false);
    }
  };

  const analyzeCV = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callAI('analyze_cv', { cvText });
      setAnalysis(result);
      // On garde « Créteil » si le CV ne donne qu'un code département nu (1 à 3
      // chiffres), qui rend mal côté offres. Une ville ou un code postal passe.
      if (result.location && !/^\d{1,3}$/.test(String(result.location).trim())) {
        setUserLocation(result.location);
      }
      await saveCvToFirestore(user.id, cvText, result);
      goToStep(2);
    } catch (err) {
      setError(err.message || "Erreur lors de l'analyse du CV. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const discoverJob = async (jobTitle, codeRome = null) => {
    const key = jobKey(jobTitle, codeRome);

    // Métier déjà exploré : on rouvre la fiche mémorisée, sans la régénérer.
    const cached = discoveredJobs.find((j) => j.key === key);
    if (cached && cached.report) {
      goToStep(3);
      activateDiscovered(cached);
      return;
    }

    setSelectedJob(jobTitle);
    setSearchKeywords(jobTitle);
    setActiveJobKey(key);
    goToStep(3);
    setIsGeneratingReport(true);
    setJobReport(null);
    setSalaryStats(null);
    setSelectedRome(null);
    setChatHistory([]);
    setError(null);

    // Crée l'entrée mémorisée (vide pour l'instant) : l'effet de synchronisation
    // la remplira au fil des résultats. On borne la liste aux derniers métiers.
    setDiscoveredJobs((prev) => {
      if (prev.some((j) => j.key === key)) return prev;
      const entry = {
        key, title: jobTitle, codeRome: codeRome || null,
        rome: null, report: null, salaryStats: null, chatHistory: [],
      };
      const next = [...prev, entry];
      return next.length > MAX_DISCOVERED ? next.slice(next.length - MAX_DISCOVERED) : next;
    });

    // Clé unifiée. Le code ROME est déjà résolu à l'analyse du CV et voyage avec
    // la carte métier : on le réutilise directement. Sinon (accès direct, repli),
    // on le résout une fois via ROMEO. Non bloquant dans les deux cas.
    if (codeRome) {
      const rome = { codeRome, libelle: jobTitle };
      patchDiscovered(key, { rome });
      setSelectedRome(rome);
    } else {
      fetch('/api/rome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: jobTitle, limit: 1 }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const rome = d?.metiers?.[0];
          if (rome?.codeRome) {
            patchDiscovered(key, { rome });
            if (activeJobKeyRef.current === key) setSelectedRome(rome);
          }
        })
        .catch(() => {}); // échec silencieux : les offres retomberont sur les mots-clés
    }

    // Salaire sourcé, lancé EN PARALLÈLE du rapport (et non après) : il s'affiche
    // dès qu'il est prêt sans allonger l'attente de l'enquête métier. Si Adzuna
    // ne renvoie rien, on garde l'estimation IA de la fiche.
    fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, location: userLocation }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.salary) {
          patchDiscovered(key, { salaryStats: d.salary });
          if (activeJobKeyRef.current === key) setSalaryStats(d.salary);
        }
      })
      .catch(() => {}); // échec silencieux : repli sur le salaire IA

    try {
      const result = await callAI('discover_job', { jobTitle, codeRome });
      if (result?.report) {
        const accueil = typeof result.initialMessage === 'string' && result.initialMessage.trim()
          ? result.initialMessage
          : `Bonjour, je fais ce métier depuis des années. Posez-moi vos questions sur le quotidien de ${jobTitle}, je vous réponds d'après le terrain.`;
        const chat = [{ role: 'assistant', content: stripMarkdown(accueil) }];
        patchDiscovered(key, { report: result.report, chatHistory: chat });
        // On n'actualise l'affichage que si ce métier est encore celui à l'écran.
        if (activeJobKeyRef.current === key) {
          setJobReport(result.report);
          setChatHistory(chat);
        }
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      if (activeJobKeyRef.current === key) {
        setError("Erreur lors de la préparation de l'enquête métier.");
      }
    } finally {
      if (activeJobKeyRef.current === key) setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading || chatHistory.length >= MAX_CHAT_MESSAGES) return;
    const newUserMsg = { role: 'user', content: chatInput };
    const newHistory = [...chatHistory, newUserMsg];
    setChatHistory(newHistory);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const recentHistory = newHistory.slice(-CHAT_HISTORY_WINDOW);
      const res = await callAI('job_chat', { selectedJob, history: recentHistory, codeRome: selectedRome?.codeRome || null });
      if (res?.reply) setChatHistory([...newHistory, { role: 'assistant', content: stripMarkdown(res.reply) }]);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'assistant', content: "Désolé, j'ai une petite urgence sur le terrain. Pouvons-nous reprendre dans un instant ?" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory]);

  // Recopie la fiche active (rapport, salaire, ROME, conversation) dans la liste
  // mémorisée, pour que passer d'un métier à l'autre ne perde rien. Le garde-fou
  // d'égalité évite toute réécriture inutile (et toute boucle de rendu).
  useEffect(() => {
    if (!activeJobKey) return;
    setDiscoveredJobs((prev) => {
      const idx = prev.findIndex((j) => j.key === activeJobKey);
      if (idx === -1) return prev;
      const cur = prev[idx];
      const merged = {
        ...cur,
        report: jobReport ?? cur.report,
        salaryStats: salaryStats ?? cur.salaryStats,
        rome: selectedRome ?? cur.rome,
        chatHistory: chatHistory.length ? chatHistory : cur.chatHistory,
      };
      if (
        merged.report === cur.report &&
        merged.salaryStats === cur.salaryStats &&
        merged.rome === cur.rome &&
        merged.chatHistory === cur.chatHistory
      ) {
        return prev;
      }
      const copy = prev.slice();
      copy[idx] = merged;
      return copy;
    });
  }, [activeJobKey, jobReport, salaryStats, selectedRome, chatHistory]);

  const searchFranceTravail = async () => {
    if (!selectedJob && !searchKeywords) return;
    goToStep(4);
    setIsSearchingOffers(true);
    setError(null);
    try {
      const res = await fetch('/api/france-travail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchKeywords || selectedJob,
          codeRome: selectedRome?.codeRome || null,
          location: userLocation,
          limit: 8,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur API (${res.status})`);
      }
      const data = await res.json();
      setSearchResults(data.offers || []);
    } catch (err) {
      setError(`Erreur API : ${err.message}`);
      setSearchResults([]);
    } finally {
      setIsSearchingOffers(false);
    }
  };

  const analyzeCompatibility = async (offer) => {
    setSelectedOffer(offer);
    goToStep(5);
    setIsAnalyzingMatch(true);
    setCoverLetter(null);
    setInterviewPrep(null);
    try {
      const result = await callAI('analyze_compatibility', {
        offer: {
          intitule: offer.intitule,
          description: offer.description,
          competencesRequises: offer.competencesRequises,
        },
        cvText,
      });
      setCompatibility(result);
      // Sauvegarde automatique de la fiche candidature (silencieuse, sans bloquer l'UI)
      fetch('/api/candidature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer, compatibility: result }),
      }).catch(() => {}); // échec silencieux : non bloquant
    } catch (err) {
      setError("Erreur lors de l'analyse de compatibilité.");
    } finally {
      setIsAnalyzingMatch(false);
    }
  };

  const generateCoverLetter = async () => {
    setIsGeneratingLetter(true);
    try {
      const textResult = await callAI('cover_letter', {
        offer: {
          intitule: selectedOffer.intitule,
          entreprise: selectedOffer.entreprise,
          description: selectedOffer.description,
        },
        cvText,
      });
      setCoverLetter(textResult);
    } catch (err) {
      setError('Erreur génération lettre de motivation.');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const generateInterviewPrep = async () => {
    setIsGeneratingPrep(true);
    try {
      const result = await callAI('interview_prep', {
        offer: {
          intitule: selectedOffer.intitule,
          description: selectedOffer.description,
        },
        cvText,
      });
      setInterviewPrep(result.questions);
    } catch (err) {
      setError("Erreur génération préparation entretien.");
    } finally {
      setIsGeneratingPrep(false);
    }
  };


  const handleRemoveEmails = () => {
    const cleaned = cvText.replace(
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
      '[email retiré]'
    );
    setCvText(cleaned);
    if (cvRating) { setCvRating(null); clearCvRatingInFirestore(user.id); }
  };

  const handleRemovePhones = () => {
    // Formats français et internationaux courants
    const cleaned = cvText.replace(
      /(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4}/g,
      '[tél retiré]'
    );
    setCvText(cleaned);
    if (cvRating) { setCvRating(null); clearCvRatingInFirestore(user.id); }
  };

  const handleRemoveWords = () => {
    if (!anonymizeWords.trim()) return;
    const words = anonymizeWords
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length === 0) return;
    const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(escaped.join('|'), 'gi');
    const cleaned = cvText.replace(pattern, '[retiré]');
    setCvText(cleaned);
    setAnonymizeWords('');
    if (cvRating) { setCvRating(null); clearCvRatingInFirestore(user.id); }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || '';

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <AppShell
      user={user}
      currentStep={step}
      maxUnlocked={maxUnlocked}
      onNavigate={(n) => setStep(n)}
      error={error}
      onCloseError={() => setError(null)}
      sessionLabel={formatSessionDate()}
      cvRating={cvRating}
      isRatingCv={isRatingCv}
      canRateCv={Boolean(cvText.trim())}
      onRateCv={rateCV}
      onShowRatingDetails={() => setShowRatingModal(true)}
      favoriteJobs={favoriteJobs}
      onOpenFavorite={openFavorite}
      onRemoveFavorite={toggleFavorite}
    >

      {/* ═══════════════ Étape 1 : Mon CV ═══════════════ */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <GuidedIntro mascot={<CatMascot className="w-14 h-14 shrink-0" />}>
            Bonjour <strong className="text-pink-500">{displayName}</strong> !
            Pour commencer, montrez-moi votre CV. Je vais lire vos compétences et vous
            proposer des pistes de reconversion réalistes.
            <div className="text-xs text-teal-700/60 mt-2 flex items-center gap-1.5">
              Vos informations restent privées
              <HelpTip
                label="Confidentialité"
                description="Votre CV est lu localement sur votre ordinateur. Le texte n'est transmis à l'IA qu'au moment de l'analyse, puis sauvegardé de façon chiffrée sur votre compte."
              />
            </div>
          </GuidedIntro>

          {/* Carte « Importer votre CV » */}
          <Card className="border-l-4 border-l-teal-600">
            <div className="px-6 pt-5 pb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-teal-800">Étape 1 — Ajouter votre CV</h2>
              <HelpTip
                label="Ajouter votre CV"
                description="Importez votre CV au format PDF, ou collez directement son texte. Le contenu est ensuite analysé."
              />
            </div>

            {/* Choix du mode : import PDF ou copier/coller */}
            <div className="px-6 pt-1 pb-3">
              <div className="inline-flex rounded-xl border border-cream-200 bg-cream-50 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setCvInputMode('upload')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    cvInputMode === 'upload'
                      ? 'bg-white text-teal-800 shadow-soft border border-cream-200'
                      : 'text-teal-700/70 hover:text-teal-800'
                  }`}
                >
                  <Upload className="w-4 h-4" /> Importer un PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCvInputMode('paste')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    cvInputMode === 'paste'
                      ? 'bg-white text-teal-800 shadow-soft border border-cream-200'
                      : 'text-teal-700/70 hover:text-teal-800'
                  }`}
                >
                  <PenTool className="w-4 h-4" /> Coller le texte
                </button>
              </div>
            </div>

            {/* Pas encore de CV : création via IAMONCV (IA française, Mistral) */}
            <div className="px-6 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
                <p className="text-sm text-teal-700/80">
                  Pas encore de CV ? Créez-le avec IAMONCV, puis revenez l'importer ici.
                </p>
                <a
                  href="/cv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold shadow-soft hover:bg-teal-700 transition-colors shrink-0"
                >
                  <FileText className="w-4 h-4" /> Je réalise mon CV avec IAMONCV
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>

            <div className="px-6 pb-6">
              {cvInputMode === 'paste' ? (
                <div className="space-y-2">
                  <label htmlFor="cv-paste" className="block text-sm font-semibold text-teal-800">
                    Collez ici le texte de votre CV
                  </label>
                  <textarea
                    id="cv-paste"
                    value={cvText}
                    onChange={(e) => {
                      setCvText(e.target.value);
                      // Le texte collé remplace tout PDF précédent : on nettoie l'aperçu fichier.
                      if (fileName) { setFileName(''); setFileSize(0); setFilePages(0); setOcrUsed(false); }
                      if (cvRating) { setCvRating(null); clearCvRatingInFirestore(user.id); }
                    }}
                    rows={12}
                    placeholder="Copiez le contenu de votre CV depuis Word, un PDF ou tout autre document, puis collez-le ici (Ctrl+V)…"
                    className="w-full p-4 border border-cream-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/50 resize-y text-sm"
                  />
                  <p className="text-xs text-teal-700/60">
                    {cvText.trim().length > 0
                      ? `${cvText.trim().length} caractères collés.`
                      : 'Astuce : sélectionnez tout votre CV, copiez, puis collez ici.'}
                  </p>
                </div>
              ) : (fileName || cvText.trim().length > 0) && !isExtractingPdf ? (
                <>
                  {fileName ? (
                    <FilePreview
                      fileName={fileName}
                      fileSize={formatBytes(fileSize)}
                      pages={filePages}
                      onChange={resetFile}
                      status="ok"
                    />
                  ) : (
                    // CV restauré d'une session précédente : pas de fichier, mais un
                    // texte à vérifier/anonymiser. On propose de le remplacer si besoin.
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-cream-200 bg-cream-50/60">
                      <span className="text-sm font-medium text-teal-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" /> Votre CV enregistré
                      </span>
                      <button
                        type="button"
                        onClick={resetFile}
                        className="text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        Importer un autre CV
                      </button>
                    </div>
                  )}

                  {/* Avertissement PDF graphique non lisible */}
                  {ocrUsed && (
                    <div className="mt-3 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">Ce CV n'est pas lisible par les logiciels de recrutement (ATS).</p>
                        <p className="text-amber-800/80 leading-relaxed">
                          Son format graphique (Canva, image, PDF scanné…) empêche l'extraction automatique du texte.
                          La plupart des ATS le rejetteront ou liront un document vide.
                          <strong> L'anonymisation est également impossible</strong> dans ce cas.
                        </p>
                        <p className="text-amber-800 font-medium">
                          Conseil : recréez ce CV dans Word, LibreOffice ou Google Docs et exportez-le en PDF — votre candidature passera beaucoup mieux les filtres automatiques.
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowCvEditor((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${showCvEditor ? 'rotate-90' : ''}`} />
                    Anonymiser, vérifier ou corriger le texte extrait
                  </button>
                  {showCvEditor && (
                    <>
                      {/* ── Panneau d'anonymisation rapide ── */}
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-2.5">
                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide flex items-center gap-1.5">
                          <EyeOff className="w-3.5 h-3.5" /> Anonymisation rapide
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleRemoveEmails}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" /> Retirer les e-mails
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePhones}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Retirer les téléphones
                          </button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={anonymizeWords}
                            onChange={(e) => setAnonymizeWords(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRemoveWords(); } }}
                            placeholder="Mots à retirer, séparés par une virgule…"
                            className="flex-1 px-3 py-1.5 text-xs border border-teal-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-teal-700/40"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveWords}
                            disabled={!anonymizeWords.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Scissors className="w-3.5 h-3.5" /> Retirer
                          </button>
                        </div>
                      </div>
                      {/* ── Textarea d'édition ── */}
                      <textarea
                        className="mt-3 w-full h-56 p-4 border border-cream-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/50 resize-y text-sm"
                        value={cvText}
                        onChange={(e) => {
                          setCvText(e.target.value);
                          if (cvRating) {
                            setCvRating(null);
                            clearCvRatingInFirestore(user.id);
                          }
                        }}
                      />
                    </>
                  )}
                </>
              ) : (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={isExtractingPdf || isLoading}
                  />
                  <div
                    className={`flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed transition-all ${
                      isExtractingPdf
                        ? 'bg-cream-50 border-cream-300 text-teal-600'
                        : 'bg-cream-50 border-cream-300 hover:border-teal-400 hover:bg-teal-50 text-teal-700'
                    }`}
                  >
                    {isExtractingPdf ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="font-semibold">Lecture du document…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-7 h-7" />
                        <span className="font-semibold">Cliquez pour choisir un PDF</span>
                        <span className="text-xs text-teal-700/60">Format PDF, jusqu'à 5 Mo</span>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </Card>

          <PrivacyBanner>
            <strong>Vos données sont protégées.</strong> Votre CV reste dans un premier temps sur votre ordinateur.
            Vous pouvez en modifier le texte (retirer votre nom et vos coordonnées téléphoniques par exemple). Il sera ensuite envoyé à l'IA <strong>uniquement</strong> au moment de l'analyse,
            puis sauvegardé sur votre compte pour vos prochaines visites.{' '}
            <HelpTip
              label="Sauvegarde"
              description="Vos données sont stockées de façon chiffrée. Vous pouvez les supprimer à tout moment depuis votre compte."
              className="align-middle"
            />
          </PrivacyBanner>

          <StepFooter
            nextLabel="vos pistes de reconversion personnalisées"
            actionLabel={isLoading ? 'Analyse en cours…' : 'Lancer le diagnostic'}
            actionDisabled={isLoading || isExtractingPdf || !cvText.trim()}
            onAction={analyzeCV}
            secondary={savedSession && (
              <Button variant="secondary" onClick={resumeSession} icon={RefreshCw}>
                Reprendre ma dernière session
              </Button>
            )}
          />
        </div>
      )}

      {/* ═══════════════ Étape 2 : Mes pistes ═══════════════ */}
      {step === 2 && analysis && (
        <div className="space-y-6 animate-fade-in">
          <GuidedIntro mascot={<CatMascot className="w-14 h-14 shrink-0" />}>
            J'ai analysé votre CV. Voici les compétences que j'y ai repérées et
            <strong> 9 pistes de métiers</strong> personnalisées. Cliquez sur l'une d'elles
            pour lancer une enquête métier.
          </GuidedIntro>

          {/* Compétences */}
          <Card className="border-l-4 border-l-teal-600">
            <div className="px-6 pt-5 pb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-teal-800">Bilan des compétences transférables</h2>
              <HelpTip
                label="Compétences transférables"
                description="Ce sont les compétences que vous pouvez réutiliser dans un autre métier, même très différent (relation client, organisation, gestion de projet, etc.)."
              />
            </div>
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.skills?.categories?.map((cat, idx) => (
                <div key={idx} className="bg-cream-50 border border-cream-200 rounded-xl p-4">
                  <h3 className="font-semibold text-teal-800 mb-3 text-sm">{cat.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items?.map((item, i) => (
                      <Badge key={i} variant="teal">{item}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pistes */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-teal-800">Étape 2 — Vos pistes de reconversion</h2>
            <HelpTip
              label="Pistes de reconversion"
              description="3 métiers proches, 3 métiers en lien logique avec votre profil, 3 pistes plus créatives. Vous restez libre de choisir celui qui vous intéresse."
            />
            <span className="ml-auto text-xs text-teal-700/70 bg-cream-50 px-3 py-1 rounded-full border border-cream-200">
              Cliquez sur un métier pour lancer l'enquête
            </span>
          </div>

          {/* Astuce : mettre un métier de côté avec l'étoile */}
          <p className="flex items-start gap-2 text-sm text-teal-700/80 bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-2.5">
            <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
            <span>
              Une piste vous intéresse mais vous voulez d'abord en voir d'autres ? Cliquez sur
              l'<strong>étoile</strong> à côté du métier pour le mettre de côté. Vous le
              retrouvez à tout moment dans <strong>« Mes métiers »</strong>, dans le menu de gauche.
            </span>
          </p>

          {['proches', 'logiques', 'eloignes'].map((type) => {
            const config = {
              proches:  { title: 'Métiers Proches',              desc: 'Similaires en termes de responsabilités.',        accent: 'border-l-teal-400'  },
              logiques: { title: 'En Lien Logique',              desc: 'Continuité basée sur vos acquis.',                accent: 'border-l-teal-600'  },
              eloignes: { title: 'Pistes Créatives (Éloignées)', desc: 'Différents mais réalistes selon vos soft-skills.', accent: 'border-l-pink-400'  },
            };
            const section = config[type];
            const jobs = analysis.suggestions?.[type] || [];
            if (jobs.length === 0) return null;

            return (
              <Card key={type} className={`border-l-4 ${section.accent}`}>
                <div className="p-5 border-b border-cream-200 bg-cream-50/60 flex items-center gap-3">
                  <BrandArrow className="w-6 h-4 shrink-0" />
                  <div>
                    <h3 className="font-bold text-teal-800">{section.title}</h3>
                    <p className="text-xs text-teal-700/70">{section.desc}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-cream-50/30 border-b border-cream-200 text-xs uppercase tracking-wider text-teal-700/70">
                        <th className="p-4 font-semibold">Métier suggéré</th>
                        <th className="p-4 font-semibold">Compétences acquises</th>
                        <th className="p-4 font-semibold">À développer</th>
                        <th className="p-4 font-semibold">Transférabilité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {jobs.map((job, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-cream-50 transition-colors group cursor-pointer"
                          onClick={() => discoverJob(job.title, job.codeRome)}
                        >
                          <td className="p-4 align-top">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(job); }}
                                aria-pressed={isFavorite(job.title)}
                                title={isFavorite(job.title) ? 'Retirer de mes métiers' : 'Mettre ce métier de côté'}
                                className={`shrink-0 mt-0.5 rounded-md p-0.5 transition-colors ${
                                  isFavorite(job.title)
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-teal-300 hover:text-amber-500'
                                }`}
                              >
                                <Star className="w-4 h-4" fill={isFavorite(job.title) ? 'currentColor' : 'none'} />
                              </button>
                              <span className="font-semibold text-teal-700 group-hover:underline flex items-center gap-2">
                                {job.title}
                                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <ul className="list-none text-sm text-teal-800 space-y-1">
                              {job.acquired?.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />{s}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-4 align-top">
                            <ul className="list-none text-sm text-teal-700/80 space-y-1">
                              {job.toDevelop?.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />{s}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-4 align-top">
                            <DifficultyBadge difficulty={job.difficulty} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}

          <StepFooter
            nextLabel="enquête métier sur le métier choisi"
            secondary={<Button variant="outline" onClick={() => setStep(1)} icon={ChevronLeft}>Retour au CV</Button>}
          />
        </div>
      )}

      {/* ═══════════════ Étape 3 : Enquête métier ═══════════════ */}
      {step === 3 && (
        <div className="space-y-6 animate-slide-in-from-right-4">
          <GuidedIntro mascot={<CatMascot className="w-14 h-14 shrink-0" />}>
            Cette étape simule une <strong>enquête métier</strong> : un professionnel
            du terrain vous répond pour que vous puissiez décider en connaissance de cause.
            Pas d'entretien d'embauche, juste un échange honnête.
          </GuidedIntro>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-teal-600" />
                Étape 3 — Enquête métier : <span className="text-teal-900">{selectedJob}</span>
              </h2>
              <HelpTip
                label="Enquête métier"
                description="Discussion avec un professionnel qui exerce ce métier. Posez-lui toutes vos questions : horaires, salaires, contraintes, satisfactions."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-cream-200 shadow-soft">
                <div className="flex items-center px-3 bg-cream-50 rounded-lg border border-cream-200">
                  <MapPin className="w-4 h-4 text-teal-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Ville (ex : Créteil)…"
                    className="w-28 sm:w-36 py-1.5 bg-transparent text-sm outline-none placeholder:text-teal-700/40"
                  />
                </div>
                <Button onClick={searchFranceTravail} icon={Search} size="md">Voir les offres</Button>
              </div>
              <Button
                onClick={() => setShowCampaignLauncher(true)}
                variant="secondary"
                icon={Send}
                size="md"
              >
                Campagne spontanée
              </Button>
            </div>
          </div>

          {/* Onglets des métiers explorés : on bascule sans rien perdre, pour comparer. */}
          {discoveredJobs.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap bg-cream-50/70 border border-cream-200 rounded-xl px-3 py-2">
              <span className="text-[11px] font-bold tracking-wider text-teal-700/60 uppercase mr-1">
                Métiers explorés
              </span>
              {discoveredJobs.map((j) => {
                const active = j.key === activeJobKey;
                return (
                  <span
                    key={j.key}
                    className={`inline-flex items-center rounded-lg border text-sm transition-all ${
                      active
                        ? 'bg-teal-600 border-teal-600 text-white shadow-soft'
                        : 'bg-white border-cream-200 text-teal-700 hover:border-teal-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => activateDiscovered(j)}
                      className="pl-3 pr-1.5 py-1.5 font-medium max-w-[14rem] truncate"
                      title={active ? j.title : `Revenir à « ${j.title} »`}
                    >
                      {j.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDiscovered(j.key)}
                      title={`Fermer « ${j.title} »`}
                      aria-label={`Fermer ${j.title}`}
                      className={`pr-2 pl-0.5 py-1.5 rounded-r-lg ${
                        active ? 'text-white/70 hover:text-white' : 'text-teal-300 hover:text-rose-500'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {isGeneratingReport ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <CatMascot className="w-16 h-16 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-teal-700">Préparation de l'enquête métier…</h3>
              <p className="text-teal-700/70">Le professionnel analyse le poste et se prépare à vous répondre.</p>
            </Card>
          ) : jobReport ? (
            <div className="space-y-6">
              {/* En quoi consiste le métier : le cœur, ancré sur la fiche ROME officielle */}
              <Card className="p-6 border-l-4 border-l-teal-500">
                <h3 className="font-bold text-teal-800 mb-3 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-teal-600" /> En quoi consiste le métier
                </h3>
                {jobReport.description && (
                  <p className="text-sm text-teal-700/90 leading-relaxed whitespace-pre-wrap">{asText(jobReport.description)}</p>
                )}
                {Array.isArray(jobReport.missions) && jobReport.missions.length > 0 && (
                  <div className="mt-4">
                    <span className="block font-semibold text-teal-800 mb-2">Missions principales</span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {jobReport.missions.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-teal-700/80">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />{asText(m)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(jobReport.skills?.hardSkills?.length > 0 || jobReport.skills?.softSkills?.length > 0) && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {jobReport.skills?.hardSkills?.length > 0 && (
                      <div>
                        <span className="block font-semibold text-teal-800 mb-2">Compétences techniques</span>
                        <div className="flex flex-wrap gap-1.5">
                          {jobReport.skills.hardSkills.map((s, i) => (
                            <Badge key={i} variant="teal" className="text-xs">{asText(s)}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {jobReport.skills?.softSkills?.length > 0 && (
                      <div>
                        <span className="block font-semibold text-teal-800 mb-2">Qualités humaines</span>
                        <div className="flex flex-wrap gap-1.5">
                          {jobReport.skills.softSkills.map((s, i) => (
                            <Badge key={i} variant="pink" className="text-xs">{asText(s)}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-5 border-l-4 border-l-teal-400">
                  <h3 className="font-bold text-teal-800 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-teal-600" /> Réalités du terrain
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="font-semibold text-teal-800 mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-teal-500" /> Horaires & Rythme
                      </span>
                      <p className="text-teal-700/80 mt-1">{asText(jobReport.realities?.horaires)}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-teal-800 mb-1 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-teal-500" /> Environnement
                      </span>
                      <p className="text-teal-700/80 mt-1">{asText(jobReport.realities?.environnement)}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-700 mb-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Contraintes / Risques
                      </span>
                      <p className="text-teal-700/80 mt-1">{asText(jobReport.realities?.risques)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-pink-400">
                  <h3 className="font-bold text-teal-800 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-600" /> Accès & Évolution
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="block font-semibold text-teal-800 mb-1">Formations clés</span>
                      <ul className="space-y-1">
                        {jobReport.evolution?.formations?.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-teal-700/80">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-teal-800 mb-2 flex items-center gap-1.5">
                        Salaire
                        <HelpTip
                          label="D'où vient ce salaire ?"
                          description="La fourchette est calculée sur les salaires des offres réellement publiées (source Adzuna). Le référentiel métier ROME sert aux missions et aux compétences, mais il n'indique aucun salaire : si aucune offre chiffrée n'est disponible, on affiche une estimation."
                        />
                      </span>
                      {salaryStats ? (
                        <div className="space-y-1">
                          <Badge variant="teal" className="text-sm">{salaryStats.rangeLabel}</Badge>
                          <p className="text-xs text-teal-700/70">
                            Médiane {salaryStats.median.toLocaleString('fr-FR')} €/an ·
                            d'après {salaryStats.sampleSize} offres réelles ({salaryStats.source}, {salaryStats.year})
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="teal" className="text-sm">{jobReport.salaire}</Badge>
                          <p className="text-xs text-teal-700/60">
                            Estimation indicative : pas assez d'offres chiffrées pour ce métier.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Chat */}
              <Card className="lg:col-span-2 flex flex-col h-[600px] border-l-4 border-l-teal-600">
                <div className="p-4 border-b border-cream-200 bg-cream-50/60 flex items-center gap-3">
                  <CatMascot className="w-10 h-10" />
                  <div className="flex-1">
                    <h3 className="font-bold text-teal-800">Expert {selectedJob}</h3>
                    <p className="text-xs text-teal-700/70">Posez vos questions sur le quotidien du métier</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-md ${
                      chatHistory.length >= MAX_CHAT_MESSAGES - 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {chatHistory.length} / {MAX_CHAT_MESSAGES}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white iamj-scrollbar" ref={chatScrollRef}>
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <CatMascot className="w-7 h-7 mr-2 shrink-0 self-end" />
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-cream-50 text-teal-800 border border-cream-200 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <CatMascot className="w-7 h-7 mr-2 shrink-0 self-end" />
                      <div className="bg-cream-50 border border-cream-200 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-cream-200 bg-white">
                  {chatHistory.length >= MAX_CHAT_MESSAGES ? (
                    <div className="bg-cream-50 border border-cream-200 rounded-xl p-3 flex items-center gap-3">
                      <Info className="w-5 h-5 text-teal-600 shrink-0" />
                      <div className="flex-1 text-sm text-teal-800">
                        <strong>Vous avez bien fait le tour de ce métier !</strong> Retournez aux pistes pour en explorer d'autres.
                      </div>
                      <Button variant="secondary" onClick={() => setStep(2)} size="sm">
                        Voir les pistes
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Posez une question sur le métier…"
                        className="flex-1 px-4 py-2 border border-cream-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none bg-cream-50/30 text-sm"
                        disabled={isChatLoading}
                      />
                      <Button type="submit" icon={Send} loading={isChatLoading} disabled={!chatInput.trim()} size="md" />
                    </form>
                  )}
                </div>
              </Card>
              </div>
            </div>
          ) : null}

          <StepFooter
            nextLabel="rechercher des offres d'emploi pour ce métier"
            secondary={<Button variant="outline" onClick={() => setStep(2)} icon={ChevronLeft}>Retour aux pistes</Button>}
          />
        </div>
      )}

      {/* ═══════════════ Étape 4 : Offres d'emploi ═══════════════ */}
      {step === 4 && (
        <div className="space-y-6 animate-slide-in-from-right-4">
          <GuidedIntro mascot={<CatMascot className="w-14 h-14 shrink-0" />}>
            Voici les offres d'emploi disponibles sur <strong>France Travail</strong> pour ce métier.
            Sélectionnez celle qui vous parle pour mesurer votre compatibilité.
          </GuidedIntro>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                Étape 4 — Offres : <span className="text-teal-900">{searchKeywords || selectedJob}</span>
              </h2>
              <HelpTip
                label="Offres d'emploi"
                description="Offres tirées en direct du site France Travail. Vous pouvez ajuster les mots-clés ou le département."
              />
            </div>

            {/* Barre de recherche */}
            <form
              onSubmit={(e) => { e.preventDefault(); searchFranceTravail(); }}
              className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-cream-200 shadow-soft"
            >
              <div className="flex items-center px-3 bg-cream-50 rounded-lg border border-cream-200">
                <Briefcase className="w-4 h-4 text-teal-500 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchKeywords}
                  onChange={(e) => setSearchKeywords(e.target.value)}
                  placeholder="Métier…"
                  className="w-36 py-1.5 bg-transparent text-sm outline-none placeholder:text-teal-700/40"
                />
              </div>
              <div className="flex items-center px-3 bg-cream-50 rounded-lg border border-cream-200">
                <MapPin className="w-4 h-4 text-teal-500 mr-2 shrink-0" />
                <input
                  type="text"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="Ville…"
                  className="w-24 py-1.5 bg-transparent text-sm outline-none placeholder:text-teal-700/40"
                />
              </div>
              <Button type="submit" loading={isSearchingOffers} icon={Search} size="md">
                {isSearchingOffers ? 'Recherche…' : 'Actualiser'}
              </Button>
            </form>
          </div>

          {isSearchingOffers ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <CatMascot className="w-16 h-16 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-teal-700">Recherche en cours…</h3>
              <p className="text-teal-700/70">Interrogation de la base France Travail</p>
            </Card>
          ) : searchResults.length === 0 ? (
            <Card className="p-12 text-center">
              <Info className="w-10 h-10 text-teal-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-teal-800">Aucune offre trouvée</h3>
              <p className="text-teal-700/70">Essayez d'élargir votre zone géographique ou de revenir aux suggestions.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {searchResults.map((offer, idx) => (
                <Card key={idx} className="p-5 hover:border-teal-300 hover:shadow-card transition-all">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {offer.url ? (
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 text-base font-bold text-teal-800 hover:text-teal-600 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-400 rounded"
                            title={`Voir la fiche complète sur ${offer.source || 'la source'}`}
                          >
                            {offer.intitule}
                            <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <h3 className="text-base font-bold text-teal-800">{offer.intitule}</h3>
                        )}
                        <Badge variant="teal">{offer.typeContrat}</Badge>
                        {offer.source && <Badge variant="rose">{offer.source}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-teal-700/70 mb-3">
                        <span className="flex items-center gap-1"><Building2 className="w-4 h-4 text-teal-500" /> {offer.entreprise}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-teal-500" /> {offer.lieu}</span>
                      </div>
                      <p className="text-teal-800/90 text-sm mb-3 line-clamp-2">{offer.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {offer.competencesRequises?.map((comp, i) => (
                          <Badge key={i} variant="cream">{comp}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button onClick={() => analyzeCompatibility(offer)} icon={BrainCircuit}>
                        Vérifier ma compatibilité
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {searchResults.length > 0 && (
            <AvisConseiller
              metier={searchKeywords || selectedJob}
              codeRome={selectedRome?.codeRome || null}
              offers={searchResults}
            />
          )}

          <StepFooter
            nextLabel="analyse de compatibilité avec une offre"
            secondary={<Button variant="outline" onClick={() => setStep(3)} icon={ChevronLeft}>Retour à l'enquête</Button>}
          />
        </div>
      )}

      {/* ═══════════════ Étape 5 : Compatibilité ═══════════════ */}
      {step === 5 && selectedOffer && (
        <div className="space-y-6 animate-slide-in-from-right-4">
          <GuidedIntro mascot={<CatMascot className="w-14 h-14 shrink-0" />}>
            Mesure de compatibilité entre votre profil et l'offre choisie. Vous pouvez
            ensuite générer une lettre de motivation et anticiper l'entretien.
          </GuidedIntro>

          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-teal-600" />
              Étape 5 — Compatibilité avec : <span className="text-teal-900">{selectedOffer.intitule}</span>
            </h2>
            <HelpTip
              label="Score de compatibilité"
              description="Note de 0 à 100 qui mesure l'adéquation entre vos compétences (CV) et les exigences de l'offre. Au-dessus de 70, votre candidature mérite d'être tentée."
            />
          </div>

          {isAnalyzingMatch ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <CatMascot className="w-16 h-16 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-teal-700">Analyse comparative en cours…</h3>
              <p className="text-teal-700/70">L'IA compare votre CV avec les exigences du poste.</p>
            </Card>
          ) : compatibility && (
            <div className="space-y-5">
              <Card className="p-8 border-l-8 border-l-teal-600">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
                  <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 ${getScoreColor(compatibility.score)}`}>
                    <span className="text-4xl font-extrabold">{compatibility.score}%</span>
                    <span className="text-xs uppercase font-bold tracking-wider opacity-70">Match</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold mb-1 text-teal-800">Diagnostic de Compatibilité</h2>
                    <p className="text-teal-700/80">Poste : <strong>{selectedOffer.intitule}</strong> chez {selectedOffer.entreprise}</p>
                    {selectedOffer.url && (
                      <a
                        href={selectedOffer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" /> Voir l'annonce d'origine
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-5">
                  <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                    <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5" /> Vos Atouts
                    </h3>
                    <ul className="space-y-2">
                      {compatibility.forces?.map((f, i) => (
                        <li key={i} className="text-emerald-700 text-sm flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-5 border border-rose-100">
                    <h3 className="font-bold text-rose-800 mb-3 flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5" /> Points de vigilance
                    </h3>
                    <ul className="space-y-2">
                      {compatibility.faiblesses?.map((f, i) => (
                        <li key={i} className="text-rose-700 text-sm flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-cream-50 rounded-xl p-5 border border-cream-200">
                  <h3 className="font-bold text-teal-800 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-teal-600" /> Conseil du Coach
                  </h3>
                  <p className="text-teal-800/90 text-sm">{compatibility.conseilGlobal}</p>
                </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-6 border-l-4 border-l-teal-400">
                  <SectionTitle icon={PenTool} className="mb-3">Lettre de Motivation</SectionTitle>
                  <p className="text-sm text-teal-700/70 mb-4">Génère un premier jet adapté à cette offre et à votre profil.</p>
                  <Button onClick={generateCoverLetter} loading={isGeneratingLetter} className="w-full" icon={PenTool}>
                    Rédiger la lettre
                  </Button>
                </Card>

                <Card className="p-6 border-l-4 border-l-pink-400">
                  <SectionTitle icon={MessageSquare} className="mb-3">Préparer l'Entretien</SectionTitle>
                  <p className="text-sm text-teal-700/70 mb-4">Simule les questions probables pour ce poste précis.</p>
                  <Button onClick={generateInterviewPrep} loading={isGeneratingPrep} variant="secondary" className="w-full" icon={MessageSquare}>
                    Générer les questions
                  </Button>
                </Card>
              </div>

              {coverLetter && (
                <Card className="p-6 border-l-4 border-l-teal-400">
                  <SectionTitle icon={FileText} className="mb-4">Proposition de Lettre</SectionTitle>
                  <div className="text-sm text-teal-900 bg-cream-50 p-6 rounded-xl border border-cream-200">
                    <CoverLetterText text={coverLetter} />
                  </div>
                </Card>
              )}

              {interviewPrep && (
                <div className="space-y-4">
                  <SectionTitle icon={BrainCircuit}>Questions d'entretien anticipées</SectionTitle>
                  <div className="grid gap-3">
                    {interviewPrep.map((q, idx) => (
                      <Card key={idx} className="p-5 border-l-4 border-l-teal-400">
                        <div className="mb-3">
                          <Badge
                            variant={q.type === 'piege' ? 'rose' : 'teal'}
                            className="mb-2"
                          >
                            Question {q.type}
                          </Badge>
                          <h4 className="font-bold text-lg text-teal-800">"{q.question}"</h4>
                        </div>
                        <div className="bg-cream-50 p-4 rounded-lg space-y-3 text-sm border border-cream-200">
                          <div>
                            <span className="font-semibold text-teal-800 block mb-1">Ce que cherche le recruteur :</span>
                            <p className="text-teal-700/80">{q.why}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-teal-700 block mb-1">Comment y répondre :</span>
                            <p className="text-teal-700/80">{q.advice}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          <StepFooter
            secondary={<Button variant="outline" onClick={() => setStep(4)} icon={ChevronLeft}>Retour aux offres</Button>}
          />
        </div>
      )}

      {/* ─────── Modal : campagne spontanée ─────── */}
      <CampaignLauncher
        isOpen={showCampaignLauncher}
        onClose={() => setShowCampaignLauncher(false)}
        cvText={cvText}
        selectedJob={selectedJob}
        userLocation={userLocation}
        preResolvedRome={selectedRome}
      />

      {/* ─────── Modal : détail de la note du CV ─────── */}
      {showRatingModal && cvRating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cv-rating-title"
          onClick={() => setShowRatingModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-cream-200 rounded-2xl shadow-card overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="px-6 py-5 border-b border-cream-200 bg-cream-50/60 flex items-start gap-4">
              <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 shrink-0 ${getScoreColor((cvRating.score || 0) * 5)}`}>
                <span className="text-xl font-extrabold leading-none">
                  {cvRating.score}<span className="text-xs opacity-70">/20</span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="cv-rating-title" className="text-lg font-bold text-teal-800 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-teal-600" />
                  Détail de l'évaluation de votre CV
                </h2>
                {cvRating.summary && (
                  <p className="text-sm text-teal-800/85 mt-1.5">{cvRating.summary}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                aria-label="Fermer"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:bg-cream-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 iamj-scrollbar">
              {/* Périmètre de l'analyse */}
              <div className="flex items-start gap-2 p-3 bg-teal-50/60 border border-teal-100 rounded-lg text-xs text-teal-800/85 leading-relaxed">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-teal-600" />
                <span>
                  Cette évaluation porte uniquement sur le <strong>contenu textuel</strong> de
                  votre CV (le texte extrait du PDF). La <strong>mise en page</strong>, le
                  design, la photo et tous les aspects visuels <strong>ne sont pas analysés</strong>.
                </span>
              </div>

              {/* Critères */}
              <section>
                <h3 className="text-sm font-bold text-teal-800 mb-3 uppercase tracking-wider">
                  Critères évalués
                </h3>
                <div className="space-y-3">
                  {(cvRating.criteria || []).map((c, idx) => (
                    <div key={idx} className="bg-cream-50 border border-cream-200 rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h4 className="font-semibold text-teal-800 text-sm">{c.name}</h4>
                        <Badge
                          variant={c.score >= 16 ? 'emerald' : c.score >= 10 ? 'amber' : 'rose'}
                          className="shrink-0"
                        >
                          {c.score}/20
                        </Badge>
                      </div>
                      {/* Barre de progression */}
                      <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${
                            c.score >= 16 ? 'bg-emerald-500' : c.score >= 10 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(20, c.score)) * 5}%` }}
                        />
                      </div>
                      <p className="text-xs text-teal-800/85 leading-relaxed">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Points forts */}
              {cvRating.strengths?.length > 0 && (
                <section className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2 text-sm">
                    <ThumbsUp className="w-4 h-4" /> Points forts
                  </h3>
                  <ul className="space-y-1.5">
                    {cvRating.strengths.map((s, i) => (
                      <li key={i} className="text-emerald-800 text-sm flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Pistes d'amélioration */}
              {cvRating.improvements?.length > 0 && (
                <section className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                  <h3 className="font-bold text-rose-800 mb-2 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4" /> Pistes d'amélioration
                  </h3>
                  <ul className="space-y-1.5">
                    {cvRating.improvements.map((s, i) => (
                      <li key={i} className="text-rose-800 text-sm flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Rappel pédagogique */}
              <div className="flex items-start gap-3 p-4 bg-cream-50 border border-cream-200 rounded-xl">
                <CatMascot className="w-10 h-10 shrink-0" />
                <p className="text-xs text-teal-800/85 leading-relaxed">
                  Cette évaluation est générée par une IA et reste <strong>indicative</strong>.
                  Surtout, gardez en tête qu'un CV <strong>n'a vraiment de sens que par rapport
                  à un poste donné</strong> : un même CV peut être excellent pour une offre et
                  mal positionné pour une autre. Pour un retour vraiment personnalisé,
                  n'hésitez pas à en discuter avec un conseiller bien <strong>humain</strong>
                  qui pourra le contextualiser selon votre parcours, votre marché et le
                  poste visé. L'étape <strong>« Compatibilité »</strong> du parcours vous
                  donnera d'ailleurs un score plus pertinent face à une offre précise.
                </p>
              </div>
            </div>

            {/* Pied de modal */}
            <div className="px-6 py-4 border-t border-cream-200 bg-cream-50/60 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowRatingModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}