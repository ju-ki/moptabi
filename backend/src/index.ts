import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';

import {
  getTripsRoute,
  createTripRoute,
  getTripDetailRoute,
  deleteTripRoute,
  uploadImageRoute,
  getDepartureAndDepartment,
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

const app = new OpenAPIHono().basePath('/api');

// 静的ファイル配信の設定

// 許可するオリジンのリスト
const allowedOrigins = ['https://moptabi-frontend.moptabi.workers.dev', 'http://localhost:3000', 'https://moptabi.com'];

app.use(
  '*',
  cors({
    origin: (origin) => {
      // リクエストのオリジンが許可リストに含まれていればそのオリジンを返す
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      // 含まれていない場合は最初のオリジンを返す（または空文字でブロック）
      return allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email', 'X-User-Name', 'X-User-Image'],
    credentials: true,
    maxAge: 600,
  }),
);

// OPTIONSリクエスト（プリフライト）に明示的に対応
app.options('*', (c) => {
  return c.text('', 204);
});

//ルートの登録
const tripApp = new OpenAPIHono();
const imageApp = new OpenAPIHono();
const spotApp = new OpenAPIHono();
const authApp = new OpenAPIHono();
const wishListApp = new OpenAPIHono();
const notificationApp = new OpenAPIHono();

// 認証が必要なルート
tripApp.use('*', requireAuth);
spotApp.use('*', requireAuth);
imageApp.use('*', requireAuth);
wishListApp.use('*', requireAuth);
notificationApp.use('*', requireAuth);

// authAppは認証なしでアクセス可能（ユーザー登録・検索など）
authApp.use('*', optionalAuth);

// トリップルートの登録
tripApp.openapi(getTripsRoute, getTripHandler.getTrips);
tripApp.openapi(getTripCountRoute, getTripHandler.getTripCount);
tripApp.openapi(createTripRoute, getTripHandler.createTrip);
tripApp.openapi(getTripDetailRoute, getTripHandler.getTripDetail);
tripApp.openapi(deleteTripRoute, getTripHandler.deleteTrip);
spotApp.openapi(getDepartureAndDepartment, getTripHandler.getDepartureAndDepartment);
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

app.route('/images', imageApp);
app.route('/trips', tripApp);
app.route('/spots', spotApp);
app.route('/auth', authApp);
app.route('/wishlist', wishListApp);
app.route('/notification', notificationApp);

// APIドキュメントの登録
app
  .doc('/specification', {
    openapi: '3.0.0',
    info: { title: '旅行計画アプリケーションAPI', version: '1.0.1' },
  })
  .get('/doc', swaggerUI({ url: '/api/specification' }));

app.onError((error: Error, c) => {
  console.log(error.message);
  if (error instanceof HTTPException) {
    return c.text(error.message, error.status);
  }
  const isDevelopment = import.meta.env.NODE_ENV === 'development';
  const message = isDevelopment ? error.message : 'Internal Server Error';
  return c.text(message, 500);
});

export default app;
