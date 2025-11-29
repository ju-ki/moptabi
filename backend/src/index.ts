import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { clerkMiddleware } from '@hono/clerk-auth';
import { cors } from 'hono/cors';
import { serve } from 'bun';
import { HTTPException } from 'hono/http-exception';

import {
  getTripsRoute,
  createTripRoute,
  getTripDetailRoute,
  deleteTripRoute,
  uploadImageRoute,
  getTransportMethodsRoute,
  getDepartureAndDepartment,
} from './routes/trip';
import { getTripHandler } from './controllers/trip';
import { getHelloRoutes } from './routes/hello';
import { getHelloHandler } from './controllers/hello';
import { findExistingUserRoute } from './routes/auth';
import { getAuthHandler } from './controllers/auth';
import { getImageHandler } from './controllers/image';
import { getImageRoute } from './routes/trip';
import { createWishlistRoute, deleteWishlistRoute, getWishlistRoute, updateWishlistRoute } from './routes/wishlist';
import { wishListHandler } from './controllers/wishlist';

const app = new OpenAPIHono().basePath('/api');

// 静的ファイル配信の設定

app.use(
  '*',
  cors({
    origin: 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Clerk-Auth'],
    credentials: true,
    maxAge: 600,
  }),
);

//ルートの登録
const helloApp = new OpenAPIHono();
const tripApp = new OpenAPIHono();
const imageApp = new OpenAPIHono();
const transportApp = new OpenAPIHono();
const spotApp = new OpenAPIHono();
const authApp = new OpenAPIHono();
const wishListApp = new OpenAPIHono();

tripApp.use(
  '*',
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

transportApp.use(
  '*',
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

spotApp.use(
  '*',
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

imageApp.use(
  '*',
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

authApp.use(
  '*',
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

wishListApp.use(
  '*',
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

helloApp.openapi(getHelloRoutes, getHelloHandler);

// トリップルートの登録
tripApp.openapi(getTripsRoute, getTripHandler.getTrips);
tripApp.openapi(createTripRoute, getTripHandler.createTrip);
tripApp.openapi(getTripDetailRoute, getTripHandler.getTripDetail);
tripApp.openapi(deleteTripRoute, getTripHandler.deleteTrip);
transportApp.openapi(getTransportMethodsRoute, getTripHandler.getTransportMethods);
spotApp.openapi(getDepartureAndDepartment, getTripHandler.getDepartureAndDepartment);
imageApp.openapi(uploadImageRoute, getImageHandler.uploadImage);
imageApp.openapi(getImageRoute, getImageHandler.getImage);

authApp.openapi(findExistingUserRoute, getAuthHandler);

wishListApp.openapi(getWishlistRoute, wishListHandler.getWishList);
wishListApp.openapi(createWishlistRoute, wishListHandler.createWishList);
wishListApp.openapi(updateWishlistRoute, wishListHandler.updateWishList);
wishListApp.openapi(deleteWishlistRoute, wishListHandler.deleteWishList);

app.route('/images', imageApp);
app.route('/hello', helloApp);
app.route('/trips', tripApp);
app.route('/transport', transportApp);
app.route('/spot', spotApp);
app.route('/auth', authApp);
app.route('/wishlist', wishListApp);

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

if (import.meta.env.NODE_ENV === 'development') {
  serve({
    port: 8787,
    fetch: app.fetch,
  });
}

export default app;
