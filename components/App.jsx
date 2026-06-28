'use client';

import { useState, useRef, useEffect } from 'react';
import {
  FileText, Search, Briefcase, CheckCircle, Target, TrendingUp,
  ChevronRight, ChevronLeft, Loader2, Upload, AlertCircle, ExternalLink,
  BrainCircuit, MapPin, Building2, PenTool, MessageSquare,
  Send, BookOpen, Clock, ThumbsUp, ThumbsDown,
  Info, ListChecks, Compass, Star, MessageCircle, RefreshCw,
  Gauge, X,
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
} from '@/lib/firebase/client';

const MAX_CHAT_MESSAGES = 30;
const CHAT_HISTORY_WINDOW = 10;

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

export default function App({ user, availableProviders = ['gemini'] }) {
  const [step, setStep] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState(1);
  const [cvText, setCvText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState('');
  const [provider, setProvider] = useState(availableProviders[0] || 'gemini');

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
        if (data.analysis) setSavedSession(data.analysis);
        // Restauration de la note précédente si elle correspond toujours
        // au CV en base (elle est nettoyée côté Firestore dès que le CV change).
        if (data.rating && typeof data.rating.score === 'number') {
          setCvRating(data.rating);
        }
      }
    });
  }, [user.id]);

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
  const [actionPlan, setActionPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [filePages, setFilePages] = useState(0);
  const [savedSession, setSavedSession] = useState(null);
  const [showCvEditor, setShowCvEditor] = useState(false);

  // Évaluation du CV (note /10 + critères détaillés)
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Veuillez sélectionner un fichier PDF.'); return; }
    setIsExtractingPdf(true);
    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    // Tout nouveau CV ⇒ on réinitialise l'évaluation précédente (état + Firestore).
    setCvRating(null);
    clearCvRatingInFirestore(user.id);
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      setFilePages(pdf.numPages);
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(' ') + '\n\n';
      }
      setCvText(fullText.trim());
    } catch (err) {
      setError('Erreur lors de la lecture du PDF. Le fichier est peut-être protégé ou illisible.');
    } finally {
      setIsExtractingPdf(false);
      e.target.value = null;
    }
  };

  const resetFile = () => {
    setFileName(''); setFileSize(0); setFilePages(0); setCvText(''); setShowCvEditor(false);
    setCvRating(null);
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
      if (result.location) setUserLocation(result.location);
      await saveCvToFirestore(user.id, cvText, result);
      goToStep(2);
    } catch (err) {
      setError(err.message || "Erreur lors de l'analyse du CV. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const discoverJob = async (jobTitle) => {
    setSelectedJob(jobTitle);
    setSearchKeywords(jobTitle);
    goToStep(3);
    setIsGeneratingReport(true);
    setJobReport(null);
    setChatHistory([]);
    setError(null);
    try {
      const result = await callAI('discover_job', { jobTitle });
      if (result?.report) {
        setJobReport(result.report);
        setChatHistory([{ role: 'assistant', content: result.initialMessage }]);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      setError("Erreur lors de la préparation de l'enquête métier.");
    } finally {
      setIsGeneratingReport(false);
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
      const res = await callAI('job_chat', { selectedJob, history: recentHistory });
      if (res?.reply) setChatHistory([...newHistory, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'assistant', content: "Désolé, j'ai une petite urgence sur le terrain. Pouvons-nous reprendre dans un instant ?" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory]);

  const searchFranceTravail = async () => {
    if (!selectedJob && !searchKeywords) return;
    goToStep(4);
    setIsSearchingOffers(true);
    setError(null);
    try {
      const res = await fetch('/api/france-travail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: searchKeywords || selectedJob, location: userLocation, limit: 8 }),
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
    setActionPlan(null);
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

  const generateActionPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const result = await callAI('action_plan', {
        offer: {
          intitule: selectedOffer.intitule,
          entreprise: selectedOffer.entreprise,
        },
        forces: compatibility.forces,
        faiblesses: compatibility.faiblesses,
      });
      setActionPlan(result.plan);
    } catch (err) {
      setError("Erreur génération plan d'action.");
    } finally {
      setIsGeneratingPlan(false);
    }
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
              <h2 className="text-lg font-bold text-teal-800">Étape 1 — Importer votre CV</h2>
              <HelpTip
                label="Importer votre CV"
                description="Téléchargez votre CV au format PDF. Il sera lu automatiquement et son contenu extrait pour permettre l'analyse."
              />
            </div>

            <div className="px-6 pb-6">
              {fileName && !isExtractingPdf ? (
                <>
                  <FilePreview
                    fileName={fileName}
                    fileSize={formatBytes(fileSize)}
                    pages={filePages}
                    onChange={resetFile}
                    status="ok"
                  />
                  <button
                    onClick={() => setShowCvEditor((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${showCvEditor ? 'rotate-90' : ''}`} />
                    Vérifier ou corriger le texte extrait
                  </button>
                  {showCvEditor && (
                    <textarea
                      className="mt-3 w-full h-56 p-4 border border-cream-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all bg-cream-50/50 resize-y text-sm"
                      value={cvText}
                      onChange={(e) => {
                        setCvText(e.target.value);
                        // Le contenu du CV change ⇒ on invalide la note précédente
                        // (état React + Firestore, pour qu'elle ne réapparaisse pas au reload).
                        if (cvRating) {
                          setCvRating(null);
                          clearCvRatingInFirestore(user.id);
                        }
                      }}
                    />
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
                          onClick={() => discoverJob(job.title)}
                        >
                          <td className="p-4 align-top">
                            <span className="font-semibold text-teal-700 group-hover:underline flex items-center gap-2">
                              {job.title}
                              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
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
                    placeholder="Dépt (ex: 75)…"
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

          {isGeneratingReport ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <CatMascot className="w-16 h-16 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-teal-700">Préparation de l'enquête métier…</h3>
              <p className="text-teal-700/70">Le professionnel analyse le poste et se prépare à vous répondre.</p>
            </Card>
          ) : jobReport ? (
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
                      <p className="text-teal-700/80 mt-1">{jobReport.realities?.horaires}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-teal-800 mb-1 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-teal-500" /> Environnement
                      </span>
                      <p className="text-teal-700/80 mt-1">{jobReport.realities?.environnement}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-700 mb-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Contraintes / Risques
                      </span>
                      <p className="text-teal-700/80 mt-1">{jobReport.realities?.risques}</p>
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
                      <span className="block font-semibold text-teal-800 mb-2">Salaire</span>
                      <Badge variant="teal" className="text-sm">{jobReport.salaire}</Badge>
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
                      <Button type="submit" disabled={!chatInput.trim() || isChatLoading} size="md">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
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
                  placeholder="Dépt…"
                  className="w-24 py-1.5 bg-transparent text-sm outline-none placeholder:text-teal-700/40"
                />
              </div>
              <Button type="submit" disabled={isSearchingOffers} icon={Search} size="md">
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
                            title="Voir la fiche complète sur France Travail"
                          >
                            {offer.intitule}
                            <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <h3 className="text-base font-bold text-teal-800">{offer.intitule}</h3>
                        )}
                        <Badge variant="teal">{offer.typeContrat}</Badge>
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
            ensuite générer une lettre de motivation, anticiper l'entretien et
            recevoir un plan d'action de 4 semaines.
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
                  <Button onClick={generateCoverLetter} disabled={isGeneratingLetter} className="w-full" icon={PenTool}>
                    Rédiger la lettre
                  </Button>
                </Card>

                <Card className="p-6 border-l-4 border-l-pink-400">
                  <SectionTitle icon={MessageSquare} className="mb-3">Préparer l'Entretien</SectionTitle>
                  <p className="text-sm text-teal-700/70 mb-4">Simule les questions probables pour ce poste précis.</p>
                  <Button onClick={generateInterviewPrep} disabled={isGeneratingPrep} variant="secondary" className="w-full" icon={MessageSquare}>
                    Générer les questions
                  </Button>
                </Card>
              </div>

              <Card className="p-6 border-l-4 border-l-teal-600">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <SectionTitle icon={ListChecks} className="mb-1">Plan d'action personnalisé</SectionTitle>
                    <p className="text-sm text-teal-700/70">Un programme sur 4 semaines pour combler vos lacunes avant de postuler.</p>
                  </div>
                  <Button onClick={generateActionPlan} disabled={isGeneratingPlan} variant="secondary" icon={ListChecks}>
                    Générer le plan
                  </Button>
                </div>
              </Card>

              {coverLetter && (
                <Card className="p-6 border-l-4 border-l-teal-400">
                  <SectionTitle icon={FileText} className="mb-4">Proposition de Lettre</SectionTitle>
                  <div className="whitespace-pre-wrap text-sm text-teal-900 bg-cream-50 p-6 rounded-xl border border-cream-200">
                    {coverLetter}
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

              {actionPlan && (
                <div className="space-y-4">
                  <SectionTitle icon={ListChecks}>Votre feuille de route à 30 jours</SectionTitle>
                  <div className="grid md:grid-cols-2 gap-3">
                    {actionPlan.map((week, idx) => (
                      <Card key={idx} className="p-5 border-l-4 border-l-teal-600">
                        <Badge variant="teal" className="mb-2">{week.semaine}</Badge>
                        <h4 className="font-bold text-teal-800 mb-3">{week.objectif}</h4>
                        <ul className="space-y-2">
                          {week.actions.map((act, i) => (
                            <li key={i} className="text-teal-700/80 text-sm flex items-start gap-2">
                              <BrandArrow className="w-5 h-3 mt-1 shrink-0" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
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
              <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 shrink-0 ${getScoreColor((cvRating.score || 0) * 10)}`}>
                <span className="text-xl font-extrabold leading-none">
                  {cvRating.score}<span className="text-xs opacity-70">/10</span>
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
                          variant={c.score >= 8 ? 'emerald' : c.score >= 5 ? 'amber' : 'rose'}
                          className="shrink-0"
                        >
                          {c.score}/10
                        </Badge>
                      </div>
                      {/* Barre de progression */}
                      <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${
                            c.score >= 8 ? 'bg-emerald-500' : c.score >= 5 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(10, c.score)) * 10}%` }}
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