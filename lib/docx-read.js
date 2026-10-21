// ════════════════════════════════════════════════════════════════════════════
// Lit le texte d'un fichier Word (.docx) dans le navigateur, sans dépendance.
//
// Un .docx est une archive ZIP ; le texte est dans word/document.xml, en
// général compressé (« deflate »). Les navigateurs récents savent le
// décompresser (DecompressionStream). On rend un paragraphe Word par ligne.
// Les anciens fichiers .doc (format binaire d'avant 2007) ne sont pas lus.
// ════════════════════════════════════════════════════════════════════════════

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Ce navigateur ne sait pas lire les fichiers Word. Enregistrez votre CV en PDF.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Cherche un fichier dans l'archive via le répertoire central du ZIP.
export async function readZipEntry(buf, wanted) {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // Fin du répertoire central : signature 0x06054b50, dans les 64 derniers Ko.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Ce fichier n'est pas un document Word valide.");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const lNameLen = view.getUint16(localOff + 26, true);
      const lExtraLen = view.getUint16(localOff + 28, true);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      throw new Error('Compression du fichier Word non prise en charge.');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error("Ce fichier n'est pas un document Word valide.");
}

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');

/** Renvoie le texte d'un fichier .docx (File ou Blob). */
export async function extractDocxText(file) {
  const buf = await file.arrayBuffer();
  const xmlBytes = await readZipEntry(buf, 'word/document.xml');
  const xml = new TextDecoder().decode(xmlBytes);
  const paragraphs = xml.split(/<\/w:p>/);
  const TOKEN = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g;
  const lines = paragraphs.map((para) => {
    let out = '';
    for (const m of para.matchAll(TOKEN)) {
      if (m[1] !== undefined) out += decodeEntities(m[1]);
      else if (m[0].startsWith('<w:tab')) out += '\t';
      else out += '\n';
    }
    return out.trimEnd();
  });
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
