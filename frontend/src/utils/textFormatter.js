// FICHIER : frontend/src/utils/textFormatter.js
// UTILITAIRE - Formatage professionnel des textes générés par l'IA

/**
 * Formate un texte généré par l'IA en HTML professionnel
 * @param {string} text - Texte brut avec markdown de l'IA
 * @returns {string} - HTML formaté et stylé
 */
export const formatAIText = (text) => {
  if (!text) return '';
  
  return text
    // Nettoyer les artefacts de code markdown
    .replace(/```[\w]*\n/g, '')
    .replace(/```/g, '')
    .replace(/^\s*\n/gm, '')
    
    // Titres avec styles professionnels
    .replace(/^### (.+)$/gm, '<h3 class="formatted-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="formatted-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="formatted-h1">$1</h1>')
    
    // Formatage du texte en gras et italique
    .replace(/\*\*(.+?)\*\*/g, '<strong class="formatted-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="formatted-em">$1</em>')
    
    // Formatage des listes avec puces personnalisées - CORRIGÉ
    .replace(/^[\s]*[-*+] (.+)$/gm, '<li class="formatted-li">$1</li>')
    // Regrouper tous les <li> consécutifs dans une seule <ul>
    .replace(/(<li[^>]*>.*?<\/li>)(?:\s*(<li[^>]*>.*?<\/li>))*/gs, (match) => {
      // Extraire tous les <li> de la correspondance
      const liElements = match.match(/<li[^>]*>.*?<\/li>/g) || [];
      if (liElements.length > 0) {
        return `<ul class="formatted-ul">${liElements.join('')}</ul>`;
      }
      return match;
    })
    // SUPPRIMÉ : .replace(/<li/g, '<li class="formatted-li-bullet"><span class="formatted-li-dot">•</span>')
    
    // Formatage des listes numérotées - CORRIGÉ
    .replace(/^[\s]*(\d+)\. (.+)$/gm, '<li class="formatted-li">$2</li>')
    // Regrouper tous les <li> consécutifs dans une seule <ol> (pour les listes numérotées)
    .replace(/(<li[^>]*>.*?<\/li>)(?:\s*(<li[^>]*>.*?<\/li>))*/gs, (match) => {
      // Vérifier si c'est déjà dans une liste à puces
      if (match.includes('formatted-ul')) return match;
      
      // Extraire tous les <li> de la correspondance
      const liElements = match.match(/<li[^>]*>.*?<\/li>/g) || [];
      if (liElements.length > 0) {
        return `<ol class="formatted-ol">${liElements.join('')}</ol>`;
      }
      return match;
    })
    
    // Formatage des citations et blocs
    .replace(/^> (.+)$/gm, '<blockquote class="formatted-blockquote">$1</blockquote>')
    
    // Formatage des codes inline
    .replace(/`([^`]+)`/g, '<code class="formatted-code">$1</code>')
    
    // Formatage des paragraphes et espacement
    .replace(/\n\n+/g, '</p><p class="formatted-paragraph">')
    .replace(/\n/g, '<br/>')
    
    // Ajouter le wrapper de paragraphe initial
    .replace(/^/, '<p class="formatted-paragraph">')
    
    // Fermer le dernier paragraphe
    .replace(/$/, '</p>')
    
    // Nettoyer les paragraphes vides
    .replace(/<p[^>]*><\/p>/g, '')
    
    // Formatage spécial pour les conseils et recommandations
    .replace(/✅|☑️|✔️/g, '<span class="formatted-success">✅</span>')
    .replace(/❌|❎|✖️/g, '<span class="formatted-error">❌</span>')
    .replace(/⚠️|⚡|💡/g, '<span class="formatted-warning">⚠️</span>')
    .replace(/🎯|🔥|⭐/g, '<span class="formatted-accent">🎯</span>')
    
    // Formatage des scores et pourcentages
    .replace(/(\d+%)/g, '<span class="formatted-score">$1</span>')
    .replace(/(\d+\/\d+)/g, '<span class="formatted-score-green">$1</span>');
};

/**
 * Formate spécifiquement une lettre de motivation
 * @param {string} letterText - Texte de la lettre
 * @returns {string} - HTML formaté pour lettre
 */
export const formatCoverLetter = (letterText) => {
  if (!letterText) return '';
  
  return letterText
    // Nettoyer les artefacts
    .replace(/```[\w]*\n/g, '')
    .replace(/```/g, '')
    
    // Formatage spécial pour les en-têtes de lettre
    .replace(/^\[([^\]]+)\]/gm, '<div class="formatted-letter-header">$1</div>')
    
    // Formatage de l'objet
    .replace(/^(OBJET\s*:.*$)/gm, '<div class="formatted-letter-objet">$1</div>')
    
    // Formatage des paragraphes de lettre
    .replace(/^§(\d+)\s*-\s*(.+)$/gm, '<h3 class="formatted-letter-section">§$1 - $2</h3>')
    
    // Puis appliquer le formatage général
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #1f2937; font-weight: 600;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color: #4b5563; font-style: italic;">$1</em>')
    
    // Formatage des paragraphes avec espacement lettre
    .replace(/\n\n+/g, '</p><p style="margin: 1.25rem 0; line-height: 1.8; color: #374151; text-align: justify; font-family: Georgia, serif;">')
    .replace(/\n/g, '<br/>')
    
    // Wrapper initial
    .replace(/^/, '<div class="formatted-letter"><p class="formatted-letter-paragraph">')
    .replace(/$/, '</p></div>')
    
    // Nettoyer
    .replace(/<p[^>]*><\/p>/g, '');
};

/**
 * Formate un texte d'analyse ou de conseils
 * @param {string} analysisText - Texte d'analyse
 * @returns {string} - HTML formaté pour analyse
 */
export const formatAnalysisText = (analysisText) => {
  if (!analysisText) return '';
  
  return formatAIText(analysisText)
    // Formatage spécial pour les sections d'analyse
    .replace(/^(ANALYSE|RECOMMANDATIONS|CONSEILS|CONCLUSION)\s*:/gmi, '<div class="formatted-analysis-section">$1</div>')
    
    // Formatage des sections numérotées
    .replace(/^(\d+)\.\s*\*\*(.+?)\*\*/gm, '<div class="formatted-analysis-item">$1. $2</div>')
    
    // Formatage des points forts/faibles
    .replace(/(Points? forts?|Atouts?|Forces?)/gi, '<span class="formatted-success">$1</span>')
    .replace(/(Points? faibles?|Faiblesses?|Améliorations?)/gi, '<span class="formatted-warning">$1</span>')
    .replace(/(Recommandations?|Conseils?)/gi, '<span class="formatted-accent">$1</span>');
};

/**
 * Composant React pour afficher du texte formaté
 * @param {Object} props - Props du composant
 * @param {string} props.text - Texte à formater
 * @param {string} props.type - Type de formatage (general, letter, analysis)
 * @param {Object} props.style - Styles additionnels
 * @returns {JSX.Element} - Composant avec texte formaté
 */
export const FormattedText = ({ text, type = 'general', style = {} }) => {
  const formatText = () => {
    switch (type) {
      case 'letter':
        return formatCoverLetter(text);
      case 'analysis':
        return formatAnalysisText(text);
      default:
        return formatAIText(text);
    }
  };

  return (
    <div
      className={`formatted-root${type === 'letter' ? ' formatted-letter-root' : ''}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: formatText() }}
    />
  );
};

export default FormattedText;
