import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher('/api(.*)');

const isPlanAccessibleRoute = createRouteMatcher(['/plan/create(.*)', '/plan/list(.*)', '/plan/(\\d+)(.*)']);
const isWishlistAccessibleRoute = createRouteMatcher(['/wishlist']);
const isAdminAccessibleRoute = createRouteMatcher(['/admin', '/admin/(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, redirectToSignIn, getToken } = await auth();

  if ((!userId && isPlanAccessibleRoute(req)) || isProtectedRoute(req)) {
    return redirectToSignIn({ returnBackUrl: '/' });
  }

  if (!userId && isWishlistAccessibleRoute(req)) {
    return redirectToSignIn({ returnBackUrl: '/' });
  }

  // 管理画面: 認証チェックのみ（ロールチェックはページ側で実施）
  if (isAdminAccessibleRoute(req)) {
    // 未ログインの場合はサインインページへリダイレクト
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: '/' });
    }

    // try {
    //   // バックエンドAPIからユーザーのroleを取得
    //   const token = await getToken();
    //   if (!token) {
    //     return NextResponse.redirect(new URL('/', req.url));
    //   }
    //   const response = await fetch(`${process.env.NEXT_DOCKER_API_BASE_URL}/auth`, {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //     },
    //   });

    //   if (response.ok) {
    //     const data = await response.json();
    //     const userRole = data.user?.role;

    //     // ADMIN以外はホームにリダイレクト
    //     if (userRole !== 'ADMIN') {
    //       return NextResponse.redirect(new URL('/', req.url));
    //     }
    //   } else {
    //     // APIエラーの場合もホームにリダイレクト
    //     return NextResponse.redirect(new URL('/', req.url));
    //   }
    // } catch (error) {
    //   console.error('Failed to check user role:', error);
    //   return NextResponse.redirect(new URL('/', req.url));
    // }
  }

  if (userId) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
