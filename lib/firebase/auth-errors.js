// Messages clairs (en français) pour les erreurs d'authentification Firebase
// les plus fréquentes. On affiche toujours le code brut en repli, pour pouvoir
// diagnostiquer les cas non listés.

const GOOGLE_ERRORS = {
  'auth/operation-not-allowed':
    "La connexion Google n'est pas activée côté Firebase (Authentication → Sign-in method → Google).",
  'auth/unauthorized-domain':
    "Ce domaine n'est pas autorisé dans Firebase (Authentication → Settings → Authorized domains).",
  'auth/popup-blocked':
    'Le navigateur a bloqué la fenêtre Google. Autorise les pop-ups pour ce site, puis réessaie.',
  'auth/popup-closed-by-user':
    'La fenêtre Google a été fermée avant la fin. Réessaie.',
  'auth/cancelled-popup-request':
    'Une autre fenêtre de connexion est déjà ouverte.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cet email via une autre méthode. Connecte-toi par email et mot de passe.',
  'auth/network-request-failed':
    'Problème de réseau. Vérifie ta connexion, puis réessaie.',
};

export function googleErrorMessage(err) {
  return (
    GOOGLE_ERRORS[err?.code] ||
    `Connexion Google impossible (${err?.code || err?.message || 'erreur inconnue'}).`
  );
}
