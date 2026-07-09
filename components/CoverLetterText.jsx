// ════════════════════════════════════════════════════════════════════════════
// CoverLetterText — rend une lettre de motivation proprement.
//
// Les lettres générées (et celles déjà en cache Firestore) contiennent parfois
// du markdown : **gras**, ### titres, - listes. Ce composant convertit ces
// marques en rendu lisible au lieu d'afficher les symboles bruts.
//
// Sans dépendance externe. Usage : <CoverLetterText text={coverLetter} />
// ════════════════════════════════════════════════════════════════════════════

// Découpe une ligne en fragments texte / gras à partir des **…**
function renderInline(line, keyPrefix) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={`${keyPrefix}-${i}`}>{m[1]}</strong>;
    // Nettoie les marques markdown résiduelles (astérisques isolés)
    return part.replace(/\*/g, '');
  });
}

export default function CoverLetterText({ text, className = '' }) {
  if (!text) return null;

  const lines = String(text).replace(/\r\n/g, '\n').split('\n');

  return (
    <div className={`leading-relaxed space-y-2 ${className}`}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();

        // Ligne vide → espacement
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Titre markdown (# … / ## … / ### …) → ligne mise en avant, sans les #
        const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <p key={i} className="font-semibold">
              {renderInline(heading[1], i)}
            </p>
          );
        }

        // Puce markdown (- … ou * …) → puce simple
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <p key={i} className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>{renderInline(bullet[1], i)}</span>
            </p>
          );
        }

        return <p key={i}>{renderInline(line, i)}</p>;
      })}
    </div>
  );
}
