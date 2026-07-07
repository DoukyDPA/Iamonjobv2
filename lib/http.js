// ════════════════════════════════════════════════════════════════════════════
// fetch avec timeout.
//
// Sans garde-fou, un appel sortant qui ne répond pas (Gemini, Mistral, France
// Travail) bloque la fonction serveur jusqu'au timeout de la plateforme.
// Quelques requêtes lentes suffisent alors à geler le service. On borne donc
// chaque appel avec un AbortController.
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT_MS = 30000;

export async function fetchWithTimeout(url, options = {}, ms = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Délai dépassé (${ms} ms) en contactant ${new URL(url).host}.`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}
