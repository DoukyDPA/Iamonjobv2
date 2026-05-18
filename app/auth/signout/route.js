import { NextResponse } from 'next/server';

export async function POST(request) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`, { status: 303 });
  response.cookies.delete('__session');
  return response;
}
