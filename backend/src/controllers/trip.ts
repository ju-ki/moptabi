import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and, count, sql, inArray } from 'drizzle-orm';
import {
  getDbFromContext,
  trip,
  planLocation,
  userLocation,
  getPostgresDb,
} from '@db';

import { getUserId } from '@/middleware/auth';
import { createTrip, getTripDetailById, updateTrip } from '@/services/trip';

import { APP_LIMITS } from '../constants/limits';

export const getTripHandler = {
  // 全ての旅行計画を取得
  getTrips: async (c: Context) => {
    const db = getPostgresDb(c);
    const userId = getUserId(c);

    if (!userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const trips = await db.query.trip.findMany({
      where: eq(trip.userId, userId),
      with: {
        plans: true,
      },
    });

    // レスポンス形式を既存のPrisma形式に合わせる
    return c.json(
      trips.map((t) => ({
        ...t,
      })),
      200,
    );
  },

  // 特定の旅行計画を取得
  getTripDetail: async (c: Context) => {
    const db = getDbFromContext(c);
    const userId = getUserId(c);
    if (!userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const tripId = parseInt(c.req.param('id'));
    if (isNaN(tripId)) {
      throw new HTTPException(400, { message: 'Invalid trip ID' });
    }

    const targetTrip = await getTripDetailById(db, tripId, userId);

    return c.json(targetTrip, 200);
  },

  deleteTrip: async (c: Context) => {
    try {
      const db = getDbFromContext(c);
      const userId = getUserId(c);
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tripId = parseInt(c.req.param('id'));

      const [targetTrip] = await db
        .select()
        .from(trip)
        .where(and(eq(trip.id, tripId), eq(trip.userId, userId)))
        .limit(1);

      if (!targetTrip) {
        return c.json({ error: 'No trip found' }, 404);
      }

      await db.delete(trip).where(eq(trip.id, tripId));

      return c.json({ message: 'Trip deleted successfully' }, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(errorMessage);
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },

  // 新しい旅行計画を登録
  createTrip: async (c: Context) => {
    const db = getPostgresDb(c);
    try {
      const createdTripId = await createTrip(db, c);
      // 作成した旅行計画のidを渡してリダイレクト用に使用させる
    if (!createdTripId) {
      throw new HTTPException(500, { message: 'Failed to create trip' });
    }
    return c.json({ id: createdTripId }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('No transactions support in neon-http driver')) {
        console.error('Transaction is not supported by the neon-http driver.');
        throw new HTTPException(500, { message: 'Failed to create trip' });
      }
      throw error;
    }
  },
  // 旅行計画の更新
  updateTrip: async (c: Context) => {
    const db = getPostgresDb(c);
    const response = await updateTrip(db, c);
    return c.json(response, 200);
  },

  /**
   * プランの作成数と上限を取得
   */
  getTripCount: async (c: Context) => {
    const db = getDbFromContext(c);
    const userId = getUserId(c);
    if (!userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const [result] = await db.select({ count: count() }).from(trip).where(eq(trip.userId, userId));

    return c.json(
      {
        count: result?.count ?? 0,
        limit: APP_LIMITS.MAX_PLANS,
      },
      200,
    );
  },
};
