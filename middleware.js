import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const publicRoutes = [
    '/login', '/signup', '/api/auth',
    // Accès bénéficiaire par code : activation et connexion sont publiques.
    '/activer', '/acces', '/api/activation',
    '/api/health', '/api/beta-signup',
    // Promotion d'un conseiller : protégée par un secret d'en-tête, pas par le
    // cookie de session. Elle doit donc échapper à la redirection /login.
    '/api/admin/promote',
    '/mentions-legales', '/confidentialite', '/cgu', '/accessibilite',
  ];
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));
  const token = request.cookies.get('__session')?.value;

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (token && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
