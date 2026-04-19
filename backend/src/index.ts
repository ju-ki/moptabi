import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { sql } from 'drizzle-orm';
import { getDbFromEnv, setRequestScopeDb, clearRequestScopeDb } from '@db/index';

import {
  getTripsRoute,
  createTripRoute,
  getTripDetailRoute,
  deleteTripRoute,
  uploadImageRoute,
  getTripCountRoute,
} from './routes/trip';
import { getTripHandler } from './controllers/trip';
import { findExistingUserRoute, getDashboardStatsRoute, getUserListRoute } from './routes/auth';
import { getAuthHandler, getStats, getUserList } from './controllers/auth';
import { getImageHandler } from './controllers/image';
import { getImageRoute } from './routes/trip';
import {
  createWishlistRoute,
  deleteWishlistRoute,
  getWishlistRoute,
  getWishlistCountRoute,
  updateWishlistRoute,
} from './routes/wishlist';
import { wishListHandler } from './controllers/wishlist';
import { getUnvisitedSpotsRoute, getVisitedSpotsRoute } from './routes/spot';
import { spotHandler } from './controllers/spot';
import {
  getNotificationsRoute,
  getUnreadCountRoute,
  markAsReadRoute,
  markAllAsReadRoute,
  createNotificationRoute,
  updateNotificationRoute,
  deleteNotificationRoute,
  getAdminNotificationsRoute,
} from './routes/notification';
import { notificationHandler } from './controllers/notification';
import { requireAuth, optionalAuth } from './middleware/auth';
import { userLocationHandler } from './controllers/userLocation';
import {
  createUserLocationRoute,
  deleteUserLocationRoute,
  getUserLocationRoute,
  updateUserLocationRoute,
} from './routes/userLocation';
import { planLocationHandler } from './controllers/planLocation';
import {
  getPlanLocationCandidatesRoute,
  createPlanLocationRoute,
  deletePlanLocationRoute,
} from './routes/planLocation';

// Cloudflare Workers用のBindings型
type Bindings = {
  DATABASE_URL: string;
  NODE_ENV?: string;
  ALLOWED_ORIGINS?: string;
  ALLOWED_ORIGIN_SUFFIXES?: string;
};

// DBをContextに追加する型
type Variables = {
  db: ReturnType<typeof getDbFromEnv>;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api');

const defaultAllowedOrigins = [
  'https://moptabi.moptabi.workers.dev', // 本番用
  'http://localhost:3000', // ローカル用
  'https://moptabi.com', // 未定
  'https://moptabi-frontend-staging.moptabi.workers.dev', // ステージング用
];

function parseCsv(value?: string): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isAllowedBySuffix(origin: string, allowedSuffixes: string[]): boolean {
  if (!allowedSuffixes.length) return false;

  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname;

    return allowedSuffixes.some((suffix) => {
      const normalizedSuffix = suffix.trim().replace(/^\.+/, '');
      if (!normalizedSuffix) return false;

      // 完全一致、またはサブドメインとして正しく終わる場合のみ許可
      return hostname === normalizedSuffix || hostname.endsWith(`.${normalizedSuffix}`);
    });
  } catch {
    return false;
  }
}

function resolveAllowedOrigin(requestOrigin: string | undefined, env?: Partial<Bindings>): string | null {
  if (!requestOrigin) return null;

  const allowedOrigins = [...defaultAllowedOrigins, ...parseCsv(env?.ALLOWED_ORIGINS)];
  const allowedOriginSuffixes = parseCsv(env?.ALLOWED_ORIGIN_SUFFIXES);

  const isAllowed = allowedOrigins.includes(requestOrigin) || isAllowedBySuffix(requestOrigin, allowedOriginSuffixes);

  return isAllowed ? requestOrigin : null;
}

app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('Origin');
  const resolvedOrigin = resolveAllowedOrigin(requestOrigin, c.env) ?? defaultAllowedOrigins[0];

  const corsMiddleware = cors({
    origin: resolvedOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email', 'X-User-Name', 'X-User-Image'],
    credentials: true,
    maxAge: 600,
  });

  return corsMiddleware(c, next);
});

// DBミドルウェア：リクエストごとにDB接続を設定
app.use('*', async (c, next) => {
  const db = getDbFromEnv(c.env);
  c.set('db', db);
  // リクエストスコープのDBを設定（サービス層からのアクセス用）
  setRequestScopeDb(db);
  try {
    await next();
  } finally {
    // リクエスト終了時にDBをクリア
    clearRequestScopeDb();
  }
});

// OPTIONSリクエスト（プリフライト）に明示的に対応
app.options('*', (c) => {
  return c.text('', 204);
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' }, 200);
});

app.get('/health/db', async (c) => {
  const db = c.get('db');
  await db.execute(sql`select 1`);
  return c.json({ status: 'ok', db: 'ok' }, 200);
});

//ルートの登録
const tripApp = new OpenAPIHono();
const imageApp = new OpenAPIHono();
const spotApp = new OpenAPIHono();
const authApp = new OpenAPIHono();
const wishListApp = new OpenAPIHono();
const notificationApp = new OpenAPIHono();
const userLocationApp = new OpenAPIHono();
const planLocationApp = new OpenAPIHono();

// 認証が必要なルート
tripApp.use('*', requireAuth);
spotApp.use('*', requireAuth);
imageApp.use('*', requireAuth);
wishListApp.use('*', requireAuth);
notificationApp.use('*', requireAuth);
userLocationApp.use('*', requireAuth);
planLocationApp.use('*', requireAuth);

// authAppは認証なしでアクセス可能（ユーザー登録・検索など）
authApp.use('*', optionalAuth);

// トリップルートの登録
tripApp.openapi(getTripsRoute, getTripHandler.getTrips);
tripApp.openapi(getTripCountRoute, getTripHandler.getTripCount);
tripApp.openapi(createTripRoute, getTripHandler.createTrip);
tripApp.openapi(getTripDetailRoute, getTripHandler.getTripDetail);
tripApp.openapi(deleteTripRoute, getTripHandler.deleteTrip);
imageApp.openapi(uploadImageRoute, getImageHandler.uploadImage);
imageApp.openapi(getImageRoute, getImageHandler.getImage);

authApp.openapi(findExistingUserRoute, getAuthHandler);
authApp.openapi(getUserListRoute, getUserList);
authApp.openapi(getDashboardStatsRoute, getStats);

wishListApp.openapi(getWishlistRoute, wishListHandler.getWishList);
wishListApp.openapi(getWishlistCountRoute, wishListHandler.getWishListCount);
wishListApp.openapi(createWishlistRoute, wishListHandler.createWishList);
wishListApp.openapi(updateWishlistRoute, wishListHandler.updateWishList);
wishListApp.openapi(deleteWishlistRoute, wishListHandler.deleteWishList);

spotApp.openapi(getUnvisitedSpotsRoute, spotHandler.getUnvisitedSpots);
spotApp.openapi(getVisitedSpotsRoute, spotHandler.getVisitedSpots);

// お知らせルートの登録
// 注意: 具体的なパスを先に登録し、動的パラメータを含むルートを後に登録
notificationApp.openapi(getAdminNotificationsRoute, notificationHandler.getAdminNotifications);
notificationApp.openapi(getNotificationsRoute, notificationHandler.getNotifications);
notificationApp.openapi(getUnreadCountRoute, notificationHandler.getUnreadCount);
notificationApp.openapi(markAllAsReadRoute, notificationHandler.markAllAsRead);
notificationApp.openapi(createNotificationRoute, notificationHandler.createNotification);
notificationApp.openapi(markAsReadRoute, notificationHandler.markAsRead);
notificationApp.openapi(updateNotificationRoute, notificationHandler.updateNotification);
notificationApp.openapi(deleteNotificationRoute, notificationHandler.deleteNotification);

// ユーザーのお気に入りルートの登録
userLocationApp.openapi(getUserLocationRoute, userLocationHandler.getUserLocationList);
userLocationApp.openapi(createUserLocationRoute, userLocationHandler.createUserLocation);
userLocationApp.openapi(updateUserLocationRoute, userLocationHandler.updateUserLocation);
userLocationApp.openapi(deleteUserLocationRoute, userLocationHandler.deleteUserLocation);

// プラン作成時の出発地・目的地履歴ルートの登録
// 注意: 具体的なパス（/candidates）を先に登録し、動的パラメータを含むルートを後に登録
planLocationApp.openapi(getPlanLocationCandidatesRoute, planLocationHandler.getCandidates);
planLocationApp.openapi(createPlanLocationRoute, planLocationHandler.create);
planLocationApp.openapi(deletePlanLocationRoute, planLocationHandler.delete);

app.route('/images', imageApp);
app.route('/trips', tripApp);
app.route('/spots', spotApp);
app.route('/auth', authApp);
app.route('/wishlist', wishListApp);
app.route('/notification', notificationApp);
app.route('/userLocation', userLocationApp);
app.route('/plan-location', planLocationApp);

// APIドキュメントの登録
app
  .doc('/specification', {
    openapi: '3.0.0',
    info: { title: '旅行計画アプリケーションAPI', version: '1.0.1' },
  })
  .get('/doc', swaggerUI({ url: '/api/specification' }));

app.onError((error: Error, c) => {
  console.log(error.message);
  const resolvedOrigin = resolveAllowedOrigin(c.req.header('Origin'), c.env);

  const withCorsHeaders = (response: Response): Response => {
    if (resolvedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', resolvedOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
    }
    return response;
  };

  if (error instanceof HTTPException) {
    return withCorsHeaders(c.text(error.message, error.status));
  }
  const runtimeNodeEnv = c.env?.NODE_ENV ?? process.env.NODE_ENV;
  const isDevelopment = runtimeNodeEnv === 'development';
  const message = isDevelopment ? error.message : 'Internal Server Error';
  return withCorsHeaders(c.text(message, 500));
});

export default app;
