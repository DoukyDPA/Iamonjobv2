// Abstraction unifiée Gemini + Mistral avec choix du modèle selon la tâche.
import { callGemini } from './gemini';
import { callMistral } from './mistral';

// Mapping des modèles par provider et par tâche.
// Le but est d'utiliser un petit modèle (moins cher) pour le chat conversationnel
// et de garder le gros modèle pour les analyses lourdes (CV, compatibilité, etc.).
const MODELS = {
  gemini: {
    default: 'gemini-2.5-flash',
    chat: 'gemini-2.5-flash',
  },
  mistral: {
    default: 'mistral-large-latest',
    chat: 'mistral-small-latest', // ~10x moins cher que Large pour le chat
  },
};

const ALLOWED_TASKS = ['default', 'chat'];
// Garde-fou : longueur maximale du prompt (caractères)
const MAX_PROMPT_LENGTH = 50_000;

/**
 * Parse robuste de la réponse JSON d'un LLM.
 */
function parseJsonResponse(text) {
  let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const startIdx = cleaned.search(/[{[]/);
    if (startIdx === -1) throw new Error('Aucune structure JSON trouvée');

    cleaned = cleaned.substring(startIdx);
    while (cleaned.length > 0) {
      try {
        return JSON.parse(cleaned);
      } catch {
        cleaned = cleaned.slice(0, -1);
      }
    }
    throw new Error('JSON impossible à parser');
  }
}

/**
 * Point d'entrée unique pour appeler l'IA.
 *
 * @param {Object} params
 * @param {string} params.provider - 'gemini' ou 'mistral'
 * @param {string} params.task - 'default' (analyses lourdes) ou 'chat' (conversation)
 * @param {string} params.prompt - Le prompt utilisateur
 * @param {string} params.systemInstruction - L'instruction système
 * @param {boolean} params.isJson - Si true, parse la réponse en JSON
 */
export async function callAI({
  provider = 'gemini',
  task = 'default',
  prompt,
  systemInstruction,
  isJson = true,
}) {
  // Garde-fou : tâche autorisée
  const safeTask = ALLOWED_TASKS.includes(task) ? task : 'default';

  // Garde-fou : taille du prompt
  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(
      `Prompt trop long (${prompt.length} caractères, max ${MAX_PROMPT_LENGTH}).`
    );
  }

  const providerKey = provider === 'mistral' ? 'mistral' : 'gemini';
  const model = MODELS[providerKey]?.[safeTask] || MODELS[providerKey].default;
  const fn = providerKey === 'mistral' ? callMistral : callGemini;

  const raw = await fn({ prompt, systemInstruction, isJson, model });

  if (!isJson) return raw;
  return parseJsonResponse(raw);
}

/**
 * Liste des providers disponibles selon les variables d'environnement.
 */
export function availableProviders() {
  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push('gemini');
  if (process.env.MISTRAL_API_KEY) providers.push('mistral');
  return providers;
}
