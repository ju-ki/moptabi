import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and, count, notInArray, asc, sql, inArray } from 'drizzle-orm';
import {
  getDbFromContext,
  trip,
  tripInfo,
  plan,
  planSpot,
  spot,
  spotMeta,
  transport,
  planLocation,
  userLocation,
} from '@db';

import { getUserId } from '@/middleware/auth';

import { DepartureAndDestinationType, TransportType, TripSchema, TripType } from '../models/trip';
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

    const transportDataList: Record<string, TransportType[]> = {};
    const planLocationDataList: Record<string, DepartureAndDestinationType[]> = {};

    for (const plan of targetTrip.plans) {
      const rawTransportData = await db.query.transport.findMany({
        where: eq(transport.planId, plan.id),
      });

      const rawPlanLocationData = await db.query.planLocation.findMany({
        where: eq(planLocation.planId, plan.id),
      });

      const transportData = rawTransportData.map((t) => ({
        transportMethod: t.transportMethod,
        travelTime: t.travelTime || '',
        cost: t.cost || 0,
        fromType: t.fromType,
        toType: t.toType,
        fromSpotId: t.fromSpotId || 0,
        toSpotId: t.toSpotId || 0,
        name: '',
      }));
      transportDataList[plan.date] = transportData;

      // PlanLocationデータをDepartureAndDestinationType形式に変換
      const planLocationData: DepartureAndDestinationType[] = rawPlanLocationData.map((pl) => {
        // この出発地/目的地に対応するtransportを検索
        const relatedTransport = rawTransportData.find((t) => {
          if (pl.locationType === 'DEPARTURE') {
            return t.fromType === 'DEPARTURE' && t.fromSpotId === pl.id;
          } else if (pl.locationType === 'DESTINATION') {
            return t.toType === 'DESTINATION' && t.toSpotId === pl.id;
          }
          return false;
        });

        return {
          name: pl.name,
          latitude: pl.latitude,
          longitude: pl.longitude,
          address: pl.address,
          label: null,
          isDefault: false,
          locationType: pl.locationType as 'DEPARTURE' | 'DESTINATION',
          usageCount: 0,
          userLocationId: null,
          planLocationId: pl.id,
          transports: relatedTransport
            ? {
                transportMethod: relatedTransport.transportMethod,
                travelTime: relatedTransport.travelTime || '',
                cost: relatedTransport.cost || 0,
                fromType: relatedTransport.fromType,
                toType: relatedTransport.toType,
                fromSpotId: relatedTransport.fromSpotId || undefined,
                toSpotId: relatedTransport.toSpotId || undefined,
              }
            : undefined,
        };
      });
      planLocationDataList[plan.date] = planLocationData;
    }
    // planSpotsをorderでソート、metaを単一オブジェクトに変換
    const formattedTrip: TripType = {
      title: targetTrip.title,
      imageUrl: targetTrip.imageUrl ?? undefined,
      startDate: targetTrip.startDate,
      endDate: targetTrip.endDate,
      tripInfo: targetTrip.tripInfos.map((tripInfo) => ({
        date: tripInfo.date,
        genreId: tripInfo.genreId,
        transportationMethod: tripInfo.transportationMethods,
        memo: tripInfo.memo || '',
      })),
      plans: targetTrip.plans.map((plan) => ({
        date: plan.date,
        spots: plan.planSpots
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((planSpot) => ({
            id: planSpot.spotId,
            location: {
              id: planSpot.spot.id || '',
              name: planSpot.spot.meta[0]?.name || '',
              lat: planSpot.spot.meta[0]?.latitude || 0,
              lng: planSpot.spot.meta[0]?.longitude || 0,
            },
            stayStart: planSpot.stayStart,
            stayEnd: planSpot.stayEnd,
            memo: planSpot.memo || '',
            image: planSpot.spot.meta[0]?.image || '',
            url: planSpot.spot.meta[0]?.url || '',
            prefecture: planSpot.spot.meta[0]?.prefecture || '',
            address: planSpot.spot.meta[0]?.address || '',
            rating: planSpot.spot.meta[0]?.rating || 0,
            category: planSpot.spot.meta[0]?.categories || [],
            catchphrase: planSpot.spot.meta[0]?.catchphrase || '',
            description: planSpot.spot.meta[0]?.description || '',
            regularOpeningHours: planSpot.spot.meta[0]?.openingHours as { day: string; hours: string }[],
            transports: transportDataList[plan.date]?.find(
              (t) => t.fromType === 'SPOT' && t.toType === 'SPOT' && t.fromSpotId == planSpot.id,
            ) ?? {
              transportMethod: 0,
              fromType: 'SPOT' as const,
              toType: 'SPOT' as const,
              travelTime: '',
              cost: 0,
              name: '',
            },
            order: planSpot.order,
            nearestStation: planSpot.spot.nearestStations[0] || null,
          })),
        departure: planLocationDataList[plan.date]?.find((pl) => pl.locationType === 'DEPARTURE') ?? {
          name: '',
          latitude: 0,
          longitude: 0,
          address: null,
          label: null,
          isDefault: false,
          locationType: 'DEPARTURE' as const,
          usageCount: null,
          userLocationId: null,
          planLocationId: null,
          transports: undefined,
        },
        destination: planLocationDataList[plan.date]?.find((pl) => pl.locationType === 'DESTINATION') ?? {
          name: '',
          latitude: 0,
          longitude: 0,
          address: null,
          label: null,
          isDefault: false,
          locationType: 'DESTINATION' as const,
          usageCount: null,
          userLocationId: null,
          planLocationId: null,
          transports: undefined,
        },
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

      // planDataからUserLocationIdを抽出して、重複を除去
      const userLocationIds = new Set<number>();
      tripData.plans.forEach((plan) => {
        if (plan.departure.userLocationId) {
          userLocationIds.add(plan.departure.userLocationId);
        }
        if (plan.destination.userLocationId) {
          userLocationIds.add(plan.destination.userLocationId);
        }
      });

      // userLocationIdsをもとにUserLocationのusageCountを更新
      if (userLocationIds.size > 0) {
        await tx
          .update(userLocation)
          .set({ usageCount: sql`${userLocation.usageCount} + 1` })
          .where(and(eq(userLocation.userId, userId), inArray(userLocation.id, Array.from(userLocationIds))));
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

        // 出発地の情報をplanLocationに登録する
        const [newDeparturePlanLocation] = await tx
          .insert(planLocation)
          .values({
            planId: newPlan.id,
            userId,
            name: planData.departure.name,
            latitude: planData.departure.latitude,
            longitude: planData.departure.longitude,
            address: planData.departure.address ?? null,
            locationType: 'DEPARTURE',
          })
          .returning();
        // 目的地の情報をplanLocationに登録する
        const [newDestinationPlanLocation] = await tx
          .insert(planLocation)
          .values({
            planId: newPlan.id,
            userId,
            name: planData.destination.name,
            latitude: planData.destination.latitude,
            longitude: planData.destination.longitude,
            address: planData.destination.address ?? null,
            locationType: 'DESTINATION',
          })
          .returning();
        // 最初のスポットへの交通手段（出発地から）- スポットがある場合のみ
        if (planData.departure.transports && createdPlanSpots.length > 0) {
          const departureTransport = planData.departure.transports;
          const firstSpot = createdPlanSpots[0];
          await tx.insert(transport).values({
            planId: newPlan.id,
            fromType: departureTransport.fromType,
            toType: departureTransport.toType,
            fromSpotId: newDeparturePlanLocation.id,
            toSpotId: firstSpot.id,
            cost: 0,
            travelTime: departureTransport.travelTime ?? '不明',
            transportMethod: departureTransport.transportMethod ?? 1,
          });

          // ユーザーのお気に入り地点が登録された場合は、使用回数を更新する
          if (planData.departure.userLocationId) {
            await tx
              .update(userLocation)
              .set({ usageCount: (planData.departure.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
              .where(and(eq(userLocation.id, planData.departure.userLocationId), eq(userLocation.userId, userId)));
          }
        }
        // 最後のスポットからの目的地への交通手段（目的地へ）- スポットがある場合のみ
        if (planData.destination.transports && createdPlanSpots.length > 0) {
          const destinationTransport = planData.destination.transports;
          const lastSpot = createdPlanSpots[createdPlanSpots.length - 1];
          await tx.insert(transport).values({
            planId: newPlan.id,
            fromType: destinationTransport.fromType,
            toType: destinationTransport.toType,
            fromSpotId: lastSpot.id,
            toSpotId: newDestinationPlanLocation.id,
            cost: 0,
            travelTime: destinationTransport.travelTime ?? '不明',
            transportMethod: destinationTransport.transportMethod ?? 1,
          });

          // ユーザーのお気に入り地点が登録された場合は、使用回数を更新する
          if (planData.destination.userLocationId) {
            await tx
              .update(userLocation)
              .set({ usageCount: (planData.destination.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
              .where(and(eq(userLocation.id, planData.destination.userLocationId), eq(userLocation.userId, userId)));
          }
        }

        // スポット間の交通手段を作成
        for (let i = 0; i < createdPlanSpots.length - 1; i++) {
          const fromSpotId = createdPlanSpots[i].id;
          const toSpotId = createdPlanSpots[i + 1].id;

          const transportData = planData.spots[i].transports;

          await tx.insert(transport).values({
            planId: newPlan.id,
            fromType: transportData.fromType,
            toType: transportData.toType,
            fromSpotId: fromSpotId,
            toSpotId: toSpotId,
            cost: transportData.cost ?? 0,
            travelTime: transportData.travelTime ?? '不明',
            transportMethod: transportData.transportMethod,
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

    // 作成した旅行計画のidを渡してリダイレクト用に使用させる
    if (createdTrip) {
      const responseTrip = {
        id: createdTrip.id,
      };
      return c.json(responseTrip, 201);
    }
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
