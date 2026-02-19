import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and, count, notInArray, asc } from 'drizzle-orm';
import { getDbFromContext, trip, tripInfo, plan, planSpot, spot, spotMeta, transport, nearestStation } from '@db';

import { getUserId } from '@/middleware/auth';

import { TripSchema } from '../models/trip';
import { APP_LIMITS, LIMIT_ERROR_MESSAGES } from '../constants/limits';

/**
 * metaを配列から単一オブジェクトに変換するヘルパー
 */
const getMeta = (spotData: { meta?: unknown[] | unknown } | null | undefined) => {
  if (!spotData) return null;
  return Array.isArray(spotData.meta) ? spotData.meta[0] || null : spotData.meta || null;
};

export const getTripHandler = {
  // 全ての旅行計画を取得
  getTrips: async (c: Context) => {
    const db = getDbFromContext(c);
    const userId = getUserId(c);

    if (!userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const trips = await db.query.trip.findMany({
      where: eq(trip.userId, userId),
      with: {
        tripInfos: true,
        plans: true,
      },
    });

    // レスポンス形式を既存のPrisma形式に合わせる
    return c.json(
      trips.map((t) => ({
        ...t,
        tripInfo: t.tripInfos,
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

    const targetTrip = await db.query.trip.findFirst({
      where: and(eq(trip.id, tripId), eq(trip.userId, userId)),
      with: {
        tripInfos: true,
        plans: {
          with: {
            planSpots: {
              with: {
                spot: {
                  with: {
                    meta: true,
                    nearestStations: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!targetTrip) {
      throw new HTTPException(404, { message: 'No trip found' });
    }

    // planSpotsをorderでソート、metaを単一オブジェクトに変換
    const formattedTrip = {
      ...targetTrip,
      tripInfo: targetTrip.tripInfos,
      plans: targetTrip.plans.map((p) => ({
        ...p,
        planSpots: p.planSpots
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((ps) => ({
            ...ps,
            spot: {
              ...ps.spot,
              meta: getMeta(ps.spot),
            },
          })),
      })),
    };

    return c.json(formattedTrip, 200);
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
    const db = getDbFromContext(c);
    const userId = getUserId(c);
    if (!userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const body = await c.req.json();
    if (!body) {
      throw new HTTPException(400, { message: 'Request body is required' });
    }

    const result = TripSchema.safeParse(body);
    if (!result.success) {
      throw new HTTPException(400, { message: 'Invalid request body' });
    }

    const tripData = result.data;

    // 上限チェック: プラン作成数
    const [countResult] = await db.select({ count: count() }).from(trip).where(eq(trip.userId, userId));

    if ((countResult?.count ?? 0) >= APP_LIMITS.MAX_PLANS) {
      throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.PLAN_LIMIT_EXCEEDED });
    }

    // 上限チェック: プラン日数
    if (tripData.plans.length > APP_LIMITS.MAX_PLAN_DAYS) {
      throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.PLAN_DAYS_LIMIT_EXCEEDED });
    }

    // 上限チェック: 1日あたりスポット数
    for (const planData of tripData.plans) {
      if (planData.spots.length > APP_LIMITS.MAX_SPOTS_PER_DAY) {
        throw new HTTPException(400, { message: LIMIT_ERROR_MESSAGES.SPOTS_PER_DAY_LIMIT_EXCEEDED });
      }
    }

    // Drizzleのtransactionを使用
    const createdTrip = await db.transaction(async (tx) => {
      // 既存のスポット一覧を取得
      const allSpotsList = await tx
        .select({ id: spot.id })
        .from(spot)
        .where(notInArray(spot.id, ['departure', 'destination']));

      const existingSpotIds = new Set(allSpotsList.map((s) => s.id));

      // 新規スポットを特定
      const nonExistingSpots = tripData.plans.flatMap((p) => p.spots.filter((s) => !existingSpotIds.has(s.id)));

      // 新規スポットを作成
      for (const spotData of nonExistingSpots) {
        await tx.insert(spot).values({ id: spotData.id });
        await tx.insert(spotMeta).values({
          id: spotData.id,
          spotId: spotData.id,
          name: spotData.location.name,
          latitude: spotData.location.lat,
          longitude: spotData.location.lng,
          image: spotData.image ?? '',
          url: spotData.url ?? '',
          prefecture: spotData.prefecture ?? '',
          address: spotData.address ?? '',
          rating: spotData.rating ?? 0,
          categories: spotData.category,
          catchphrase: spotData.catchphrase ?? '',
          description: spotData.description ?? '',
          openingHours: spotData.regularOpeningHours ? spotData.regularOpeningHours : null,
        });
      }

      // Tripを作成
      const [newTrip] = await tx
        .insert(trip)
        .values({
          title: tripData.title,
          imageUrl: tripData.imageUrl,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          userId,
        })
        .returning();

      // TripInfoを作成
      for (const info of tripData.tripInfo) {
        await tx.insert(tripInfo).values({
          tripId: newTrip.id,
          date: info.date,
          genreId: info.genreId,
          transportationMethods: info.transportationMethod,
          memo: info.memo ?? '',
        });
      }

      // Plans と PlanSpots を作成
      for (const planData of tripData.plans) {
        const [newPlan] = await tx
          .insert(plan)
          .values({
            tripId: newTrip.id,
            date: planData.date,
          })
          .returning();

        // PlanSpotsを作成
        const createdPlanSpots = [];
        for (const spotData of planData.spots) {
          const [newPlanSpot] = await tx
            .insert(planSpot)
            .values({
              planId: newPlan.id,
              spotId: spotData.id,
              stayStart: spotData.stayStart,
              stayEnd: spotData.stayEnd,
              memo: spotData.memo ?? null,
              order: spotData.order,
            })
            .returning();
          createdPlanSpots.push(newPlanSpot);
        }

        // スポット間の交通手段を作成
        for (let i = 0; i < createdPlanSpots.length - 1; i++) {
          const fromSpot = createdPlanSpots[i];
          const toSpot = createdPlanSpots[i + 1];
          const transportData = planData.spots[i].transports;

          await tx.insert(transport).values({
            planId: newPlan.id,
            fromType: 'SPOT',
            toType: 'SPOT',
            fromSpotId: fromSpot.id,
            toSpotId: toSpot.id,
            cost: transportData.cost ?? 0,
            travelTime: transportData.travelTime ?? '不明',
            transportMethod: transportData.transportMethod,
          });
        }

        // 最初のスポットへの交通手段（出発地から）
        if (createdPlanSpots.length > 0) {
          const firstSpot = createdPlanSpots[0];
          await tx.insert(transport).values({
            planId: newPlan.id,
            fromType: 'DEPARTURE',
            toType: 'SPOT',
            toSpotId: firstSpot.id,
            cost: 0,
            travelTime: '出発',
            transportMethod: 1,
          });
        }

        // 最後のスポットからの交通手段（目的地へ）
        if (createdPlanSpots.length > 0) {
          const lastSpot = createdPlanSpots[createdPlanSpots.length - 1];
          await tx.insert(transport).values({
            planId: newPlan.id,
            fromType: 'SPOT',
            toType: 'DESTINATION',
            fromSpotId: lastSpot.id,
            cost: 0,
            travelTime: '帰宅',
            transportMethod: 1,
          });
        }
      }

      // 作成したTripを取得して返す
      return await tx.query.trip.findFirst({
        where: eq(trip.id, newTrip.id),
        with: {
          tripInfos: true,
          plans: {
            with: {
              planSpots: {
                with: {
                  spot: {
                    with: {
                      meta: true,
                      nearestStations: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    // レスポンス形式を整形
    if (createdTrip) {
      const formattedTrip = {
        ...createdTrip,
        tripInfo: createdTrip.tripInfos,
        plans: createdTrip.plans.map((p) => ({
          ...p,
          planSpots: p.planSpots.map((ps) => ({
            ...ps,
            spot: {
              ...ps.spot,
              meta: getMeta(ps.spot),
            },
          })),
        })),
      };
      return c.json(formattedTrip, 201);
    }

    return c.json(createdTrip, 201);
  },

  /**
   * ユーザーの出発地と目的地の取得
   */
  getDepartureAndDepartment: async (c: Context) => {
    try {
      const db = getDbFromContext(c);
      const userId = getUserId(c);
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // PlanSpotをSpotとMetaと共に取得
      const planSpots = await db.query.planSpot.findMany({
        with: {
          spot: {
            with: {
              meta: true,
            },
          },
          plan: {
            with: {
              trip: true,
            },
          },
        },
      });

      // フィルタリング: ユーザーIDとdeparture/destinationで始まるスポット
      const departureAndDestinationSpots = planSpots.filter((ps) => {
        if (ps.plan?.trip?.userId !== userId) return false;
        return ps.spotId.startsWith('departure') || ps.spotId.startsWith('destination');
      });

      const allDeparture: { id: string; name: string; lat: number; lng: number }[] = [];
      const allDestination: { id: string; name: string; lat: number; lng: number }[] = [];
      const seenDeparture = new Set<string>();
      const seenDestination = new Set<string>();

      departureAndDestinationSpots.forEach((item) => {
        const meta = getMeta(item.spot);
        if (!meta) return;

        if (item.spotId.startsWith('departure') && !seenDeparture.has(meta.name)) {
          seenDeparture.add(meta.name);
          allDeparture.push({
            id: meta.id,
            name: meta.name,
            lat: meta.latitude,
            lng: meta.longitude,
          });
        }
        if (item.spotId.startsWith('destination') && !seenDestination.has(meta.name)) {
          seenDestination.add(meta.name);
          allDestination.push({
            id: meta.id,
            name: meta.name,
            lat: meta.latitude,
            lng: meta.longitude,
          });
        }
      });

      const response = {
        departure: allDeparture,
        destination: allDestination,
      };
      return c.json(response, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(errorMessage);
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
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
