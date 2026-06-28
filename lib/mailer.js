// ════════════════════════════════════════════════════════════════════════════
// Mailer — Lot 5 du module candidatures spontanées
//
// Utilise l'API REST Resend directement (fetch Node natif — zéro dépendance).
// Doc : https://resend.com/docs/api-reference/emails/send-email
//
// Variables d'environnement requises :
//   RESEND_API_KEY       — clé API Resend (sk_live_…)
//   RESEND_FROM_EMAIL    — adresse expéditrice vérifiée dans Resend
//                          ex. "Candidatures <candidatures@mondomaine.fr>"
//
// RGPD : on ne journalise jamais le contenu du mail ni l'adresse destinataire.
// ════════════════════════════════════════════════════════════════════════════

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Envoie un email via l'API Resend.
 *
 * @param {Object} opts
 * @param {string}   opts.to      - adresse destinataire
 * @param {string}   opts.subject - objet du mail
 * @param {string}   opts.text    - corps en texte brut
 * @param {string}  [opts.html]   - corps HTML (optionnel ; sinon on convertit text)
 * @returns {Promise<{ id: string }>} identifiant Resend de l'envoi
 */
export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) throw new Error('RESEND_API_KEY manquant dans les variables d\'environnement.');
  if (!from)   throw new Error('RESEND_FROM_EMAIL manquant dans les variables d\'environnement.');
  if (!to)     throw new Error('Adresse destinataire (to) manquante.');
  if (!subject) throw new Error('Objet du mail (subject) manquant.');
  if (!text && !html) throw new Error('Corps du mail (text ou html) manquant.');

  // Conversion texte → HTML minimal si pas d'HTML fourni
  const htmlBody = html ?? text.replace(/\n/g, '<br>\n');

  const res = await fetch(RESEND_ENDPOINT, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from,
      to:      [to],
      subject,
      text:    text ?? '',
      html:    htmlBody,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // On lève une erreur descriptive mais on ne journalise pas le destinataire.
    throw new Error(
      `Resend ${res.status} — ${body.message || body.name || JSON.stringify(body)}`
    );
  }

  return res.json(); // { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
}
