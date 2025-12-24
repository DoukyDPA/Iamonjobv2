// ... imports ...
import MatchingAnalysis from '../components/Analysis/MatchingAnalysis';

// ... (Début du fichier SimplifiedDashboard identique) ...

  // 1. VUE "J'AI VU UNE OFFRE" (Corrigée pour afficher l'analyse)
  const MatchOfferView = () => {
    const [offerText, setOfferText] = useState('');
    const [inputType, setInputType] = useState('text');
    const [analyzing, setAnalyzing] = useState(false);
    const [compatibilityResult, setCompatibilityResult] = useState(null); // Nouvel état pour stocker le résultat

    const hasOfferUploaded = documentStatus.offre_emploi?.uploaded;

    const handleMatch = async () => {
      // Validation
      if (inputType === 'text' && !offerText.trim()) return toast.error('Collez une offre d\'abord');
      if (inputType === 'file' && !hasOfferUploaded) return toast.error('Veuillez charger un fichier d\'abord');

      setAnalyzing(true);
      setCompatibilityResult(null); // Reset précédent résultat

      try {
        // Si c'est du texte, on l'envoie comme note ou contexte, sinon on utilise le fichier
        // Note: L'API /api/actions/compatibility utilise le fichier 'offre_emploi' par défaut s'il existe
        // Si l'utilisateur colle du texte, il faudrait idéalement l'envoyer au backend.
        // Pour simplifier ici, on suppose que si c'est du texte, on l'upload d'abord comme fichier texte temporaire.
        
        if (inputType === 'text') {
           // Upload du texte comme fichier "offre_emploi"
           const blob = new Blob([offerText], { type: 'text/plain' });
           const file = new File([blob], "offre_collee.txt", { type: "text/plain" });
           await uploadDocument(file, 'offre_emploi');
        }

        // Appel API réel
        const response = await fetch('/api/actions/compatibility', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({ service_id: 'matching_cv_offre' })
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast.success("Analyse terminée !");
          // Stocker le résultat brut (JSON ou Texte) pour le passer à MatchingAnalysis
          setCompatibilityResult(data.matching || data.response || data.analysis || data.content);
        } else {
          toast.error("Erreur lors de l'analyse : " + (data.error || 'Inconnue'));
        }
      } catch (e) {
        console.error(e);
        toast.error("Erreur technique lors de l'analyse");
      } finally {
        setAnalyzing(false);
      }
    };

    return (
      <div style={styles.subPageContainer}>
        <button onClick={() => setCurrentView('dashboard')} style={styles.backButton}>
          <FiArrowLeft /> Retour au tableau de bord
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '60px', height: '60px', background: '#ecfeff', color: '#0a6b79', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 20px auto' }}>
            <FiTarget />
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '10px' }}>Analyse de Compatibilité</h2>
          <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
            Vérifiez si votre CV correspond à l'offre visée.
          </p>
        </div>

        {/* INPUT CARD (Cachée si résultat affiché ? Non, on la garde pour refaire une analyse) */}
        {!compatibilityResult && (
          <div style={styles.inputCard}>
            {/* Onglets */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <button 
                onClick={() => setInputType('text')}
                style={{ padding: '10px 20px', borderBottom: inputType === 'text' ? '2px solid #0a6b79' : 'none', color: inputType === 'text' ? '#0a6b79' : '#64748b', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FiEdit3 /> Coller le texte
              </button>
              <button 
                onClick={() => setInputType('file')}
                style={{ padding: '10px 20px', borderBottom: inputType === 'file' ? '2px solid #0a6b79' : 'none', color: inputType === 'file' ? '#0a6b79' : '#64748b', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FiPaperclip /> Télécharger un fichier
              </button>
            </div>

            {/* Contenu Onglet Texte */}
            {inputType === 'text' && (
              <textarea 
                style={styles.textArea}
                placeholder="Collez le texte de l'offre ici..."
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
              />
            )}

            {/* Contenu Onglet Fichier */}
            {inputType === 'file' && (
              <div style={{ padding: '40px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc' }}>
                {hasOfferUploaded ? (
                  <div>
                    <div style={{ width: '50px', height: '50px', background: '#dcfce7', color: '#166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', fontSize: '24px' }}>
                      <FiCheck />
                    </div>
                    <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>{documentStatus.offre_emploi?.fileName || 'Fichier prêt'}</p>
                    <label htmlFor="offer-upload-match" style={{ ...styles.secondaryButton, display: 'inline-flex', cursor: 'pointer' }}>
                      Remplacer le fichier
                    </label>
                  </div>
                ) : (
                  <div>
                    <FiUpload style={{ fontSize: '40px', color: '#94a3b8', marginBottom: '15px' }} />
                    <label htmlFor="offer-upload-match" style={{ ...styles.secondaryButton, display: 'inline-flex', cursor: 'pointer' }}>
                      Sélectionner un fichier
                    </label>
                  </div>
                )}
                <input 
                  id="offer-upload-match" 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt" 
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, 'offre_emploi')}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={handleMatch}
                disabled={analyzing}
                style={{ ...styles.primaryButton, opacity: analyzing ? 0.7 : 1 }}
              >
                {analyzing ? 'Analyse en cours...' : 'Comparer avec mon CV'} <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* RÉSULTAT DE L'ANALYSE */}
        {compatibilityResult && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
               <h3 style={{ margin: 0 }}>Résultat de l'analyse</h3>
               <button onClick={() => setCompatibilityResult(null)} style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer' }}>
                 Nouvelle analyse
               </button>
            </div>
            <MatchingAnalysis preloadedData={compatibilityResult} />
          </div>
        )}

        {/* SECTION PARTENAIRES */}
        <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#1f2937', marginBottom: '10px' }}>
              Nos partenaires recrutent
            </h3>
            <p style={{ color: '#64748b' }}>
              Testez votre compatibilité avec ces métiers.
            </p>
          </div>
          <PartnerJobs />
        </div>
      </div>
    );
  };

// ... (Le reste du fichier SimplifiedDashboard reste inchangé) ...
