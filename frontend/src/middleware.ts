import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import type { NextRequest } from 'next/server';

// 保護されたルートのパターン
const protectedRoutes = ['/plan/create', '/plan/list', '/plan/', '/wishlist', '/admin', '/mypage'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuthのAPIルートはスキップ
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 認証が必要なルートかチェック
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    // JWTトークンを確認
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    // 未認証で保護されたルートにアクセスした場合
    if (!token) {
      const signInUrl = new URL('/api/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
