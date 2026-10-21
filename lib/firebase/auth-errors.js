// Messages clairs (en français) pour les erreurs d'authentification Firebase
// les plus fréquentes. On affiche toujours le code brut en repli, pour pouvoir
// diagnostiquer les cas non listés.

const GOOGLE_ERRORS = {
  'auth/operation-not-allowed':
    "La connexion Google n'est pas activée côté Firebase (Authentication → Sign-in method → Google).",
  'auth/unauthorized-domain':
    "Ce domaine n'est pas autorisé dans Firebase (Authentication → Settings → Authorized domains).",
  'auth/popup-blocked':
    'Le navigateur a bloqué la fenêtre Google. Autorisez les fenêtres surgissantes pour ce site, puis réessayez.',
  'auth/popup-closed-by-user':
    'La fenêtre Google a été fermée avant la fin. Réessayez.',
  'auth/cancelled-popup-request':
    'Une autre fenêtre de connexion est déjà ouverte.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cet email via une autre méthode. Connectez-vous par e-mail et mot de passe.',
  'auth/network-request-failed':
    'Problème de réseau. Vérifiez votre connexion, puis réessayez.',
};

export function googleErrorMessage(err) {
  return (
    GOOGLE_ERRORS[err?.code] ||
    `Connexion Google impossible (${err?.code || err?.message || 'erreur inconnue'}).`
  );
}
