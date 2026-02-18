import { NextResponse } from 'next/server';

import { auth } from '../auth';

import type { NextRequest } from 'next/server';

// 保護されたルートのパターン
const protectedRoutes = ['/plan/create', '/plan/list', '/plan/', '/wishlist', '/admin', '/mypage'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // NextAuthのAPIルートはスキップ
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 認証が必要なルートかチェック
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    // auth()が提供するセッション情報を使用
    if (!req.auth) {
      const signInUrl = new URL('/api/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
