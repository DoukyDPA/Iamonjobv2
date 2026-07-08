import { NextResponse } from 'next/server';

export async function POST(request) {
  // Derrière un proxy (Railway), new URL(request.url).origin renvoie l'hôte
  // interne (localhost:3000). On reconstruit l'origine publique à partir des
  // en-têtes forwarded, puis de NEXT_PUBLIC_SITE_URL, l'origin restant le
  // dernier recours.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  let origin;
  if (forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    origin = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  } else {
    origin = new URL(request.url).origin;
  }

  const response = NextResponse.redirect(`${origin}/login`, { status: 303 });
  response.cookies.delete('__session');
  return response;
}
