import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { callAI, availableProviders } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ providers: availableProviders() });
}

export async function POST(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { provider, task, prompt, systemInstruction, isJson = true } = body;
  if (!prompt || !systemInstruction) {
    return NextResponse.json(
      { error: 'Les champs prompt et systemInstruction sont requis.' },
      { status: 400 }
    );
  }

  try {
    const result = await callAI({ provider, task, prompt, systemInstruction, isJson });
    return NextResponse.json({ result });
  } catch (err) {
    console.error('Erreur API IA :', err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'appel à l'IA." },
      { status: 500 }
    );
  }
}
