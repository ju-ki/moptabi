import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and, count, sql, inArray } from 'drizzle-orm';
import {
  getDbFromContext,
  trip,
  plan,
  planSpot,
  transport,
  planLocation,
  planLocationNearestStation,
  userLocation,
  planSpotNearestStation,
} from '@db';

import { getUserId } from '@/middleware/auth';
import { updateTrip } from '@/services/trip';
import { validateLimit } from '@/services/limit';

import {
  DepartureAndDestinationType,
  TransportType,
  TripDetailResponseSchema,
  TripDetailResponseType,
  TripSchema,
} from '../models/trip';
import { APP_LIMITS } from '../constants/limits';

const DEFAULT_DEPARTURE_TIME = '09:00';
const DEFAULT_DESTINATION_TIME = '18:00';

function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function calcStayDuration(stayStart: string, stayEnd: string): number {
  const startMinutes = parseTimeToMinutes(stayStart);
  const endMinutes = parseTimeToMinutes(stayEnd);
  return Math.max(endMinutes - startMinutes, 0);
}

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

    const targetTrip = await db.query.trip.findFirst({
      where: and(eq(trip.id, tripId), eq(trip.userId, userId)),
      with: {
        plans: {
          with: {
            planSpots: {
              with: {
                nearestStations: true,
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
        with: {
          nearestStation: true,
        },
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
          time: pl.time,
          label: null,
          isDefault: false,
          locationType: pl.locationType as 'DEPARTURE' | 'DESTINATION',
          usageCount: 0,
          userLocationId: null,
          planLocationId: pl.id,
          nearestStation:
            pl.nearestStation && pl.nearestStation.length > 0
              ? {
                  placeId: pl.nearestStation[0].placeId,
                  stationType: pl.nearestStation[0].stationType as 'BUS' | 'TRAIN' | 'OTHER',
                  transitTime: pl.nearestStation[0].transitTime ?? undefined,
                  scheduledDepartureTime: pl.nearestStation[0].scheduledDepartureTime ?? undefined,
                  memo: pl.nearestStation[0].memo ?? undefined,
                }
              : null,
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
    // planSpotsをorderでソート、placeIdのみ返す（SpotMetaは返さない）
    const formattedTrip: TripDetailResponseType = {
      title: targetTrip.title,
      imageUrl: targetTrip.imageUrl ?? undefined,
      startDate: targetTrip.startDate,
      endDate: targetTrip.endDate,
      plans: targetTrip.plans.map((plan) => ({
        date: plan.date,
        memo: plan.memo || '',
        spots: plan.planSpots
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((planSpot) => {
            // 最寄駅情報を取得（複数存在する可能性を想定し、最初のものを使用）
            const nearestStationData =
              planSpot.nearestStations && planSpot.nearestStations.length > 0 ? planSpot.nearestStations[0] : null;

            return {
              id: planSpot.spotId, // placeIdのみ
              stayStart: planSpot.stayStart,
              stayEnd: planSpot.stayEnd,
              stayDuration: planSpot.stayDuration,
              memo: planSpot.memo || '',
              order: planSpot.order,
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
              nearestStation: nearestStationData
                ? {
                    placeId: nearestStationData.placeId,
                    stationType: nearestStationData.stationType as 'BUS' | 'TRAIN' | 'OTHER',
                    transitTime: nearestStationData.transitTime ?? undefined,
                    scheduledDepartureTime: nearestStationData.scheduledDepartureTime ?? undefined,
                    memo: nearestStationData.memo ?? undefined,
                  }
                : null,
            };
          }),
        departure: planLocationDataList[plan.date]?.find((pl) => pl.locationType === 'DEPARTURE') ?? {
          name: '',
          latitude: 0,
          longitude: 0,
          time: DEFAULT_DEPARTURE_TIME,
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
          time: DEFAULT_DESTINATION_TIME,
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

    const responseBody = TripDetailResponseSchema.parse(formattedTrip);
    return c.json(responseBody, 200);
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

    // 上限チェック
    await validateLimit(userId, tripData);

    type TripWriteExecutor = Pick<typeof db, 'insert' | 'update' | 'query'>;

    const persistTrip = async (executor: TripWriteExecutor) => {
      // Tripを作成
      const [newTrip] = await executor
        .insert(trip)
        .values({
          title: tripData.title,
          imageUrl: tripData.imageUrl,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          userId,
        })
        .returning();

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
        await executor
          .update(userLocation)
          .set({ usageCount: sql`${userLocation.usageCount} + 1` })
          .where(and(eq(userLocation.userId, userId), inArray(userLocation.id, Array.from(userLocationIds))));
      }

      // Plans と PlanSpots を作成
      for (const planData of tripData.plans) {
        const [newPlan] = await executor
          .insert(plan)
          .values({
            tripId: newTrip.id,
            date: planData.date,
            memo: planData.memo ?? null,
          })
          .returning();

        // PlanSpotsを作成
        const createdPlanSpots = [];
        for (const spotData of planData.spots) {
          const [newPlanSpot] = await executor
            .insert(planSpot)
            .values({
              planId: newPlan.id,
              spotId: spotData.id,
              stayStart: spotData.stayStart,
              stayEnd: spotData.stayEnd,
              stayDuration: spotData.stayDuration ?? calcStayDuration(spotData.stayStart, spotData.stayEnd),
              memo: spotData.memo ?? null,
              order: spotData.order,
            })
            .returning();
          createdPlanSpots.push(newPlanSpot);
        }

        // 出発地の情報をplanLocationに登録する
        const [newDeparturePlanLocation] = await executor
          .insert(planLocation)
          .values({
            planId: newPlan.id,
            userId,
            name: planData.departure.name,
            latitude: planData.departure.latitude,
            longitude: planData.departure.longitude,
            time: planData.departure.time ?? DEFAULT_DEPARTURE_TIME,
            locationType: 'DEPARTURE',
          })
          .returning();
        // 目的地の情報をplanLocationに登録する
        const [newDestinationPlanLocation] = await executor
          .insert(planLocation)
          .values({
            planId: newPlan.id,
            userId,
            name: planData.destination.name,
            latitude: planData.destination.latitude,
            longitude: planData.destination.longitude,
            time: planData.destination.time ?? DEFAULT_DESTINATION_TIME,
            locationType: 'DESTINATION',
          })
          .returning();

        if (planData.departure.nearestStation?.placeId && planData.departure.nearestStation?.stationType) {
          await executor.insert(planLocationNearestStation).values({
            planLocationId: newDeparturePlanLocation.id,
            placeId: planData.departure.nearestStation.placeId,
            stationType: planData.departure.nearestStation.stationType,
            transitTime: planData.departure.nearestStation.transitTime ?? null,
            scheduledDepartureTime: planData.departure.nearestStation.scheduledDepartureTime ?? null,
            memo: planData.departure.nearestStation.memo ?? planData.departure.nearestStation.transitMemo ?? null,
          });
        }

        if (planData.destination.nearestStation?.placeId && planData.destination.nearestStation?.stationType) {
          await executor.insert(planLocationNearestStation).values({
            planLocationId: newDestinationPlanLocation.id,
            placeId: planData.destination.nearestStation.placeId,
            stationType: planData.destination.nearestStation.stationType,
            transitTime: planData.destination.nearestStation.transitTime ?? null,
            scheduledDepartureTime: planData.destination.nearestStation.scheduledDepartureTime ?? null,
            memo: planData.destination.nearestStation.memo ?? planData.destination.nearestStation.transitMemo ?? null,
          });
        }

        const planSpotIdByRef = new Map<string, number>();
        for (const [index, createdPlanSpot] of createdPlanSpots.entries()) {
          const originalSpot = planData.spots[index];
          const spotRef = originalSpot.clientRef ?? originalSpot.id;
          planSpotIdByRef.set(spotRef, createdPlanSpot.id);
        }

        // spots[].nearestStation から planSpotNearestStations を自動生成
        const autoGeneratedNearestStations: typeof planData.planSpotNearestStations = [];
        for (const [index, spotData] of planData.spots.entries()) {
          if (spotData.nearestStation && spotData.nearestStation.placeId && spotData.nearestStation.stationType) {
            const spotRef = spotData.clientRef ?? spotData.id;
            autoGeneratedNearestStations.push({
              planSpotRef: spotRef,
              placeId: spotData.nearestStation.placeId,
              stationType: spotData.nearestStation.stationType,
              transitTime: spotData.nearestStation.transitTime,
              scheduledDepartureTime: spotData.nearestStation.scheduledDepartureTime,
              memo: spotData.nearestStation.memo ?? spotData.nearestStation.transitMemo,
              transitMemo: spotData.nearestStation.transitMemo,
            });
          }
        }

        // 既存の planSpotNearestStations と自動生成されたものをマージ
        const allNearestStations = [
          ...(autoGeneratedNearestStations || []),
          ...(planData.planSpotNearestStations || []),
        ];

        if (allNearestStations && allNearestStations.length > 0) {
          for (const stationData of allNearestStations) {
            const targetPlanSpotId = planSpotIdByRef.get(stationData.planSpotRef);
            if (!targetPlanSpotId) {
              throw new HTTPException(400, { message: `Unknown planSpotRef: ${stationData.planSpotRef}` });
            }

            await executor.insert(planSpotNearestStation).values({
              planSpotId: targetPlanSpotId,
              placeId: stationData.placeId,
              stationType: stationData.stationType,
              transitTime: stationData.transitTime ?? null,
              scheduledDepartureTime: stationData.scheduledDepartureTime ?? null,
              memo: stationData.memo ?? stationData.transitMemo ?? null,
            });
          }
        }

        // 最初のスポットへの交通手段（出発地から）- スポットがある場合のみ
        if (planData.departure.transports && createdPlanSpots.length > 0) {
          const departureTransport = planData.departure.transports;
          const firstSpot = createdPlanSpots[0];
          await executor.insert(transport).values({
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
            await executor
              .update(userLocation)
              .set({ usageCount: (planData.departure.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
              .where(and(eq(userLocation.id, planData.departure.userLocationId), eq(userLocation.userId, userId)));
          }
        }
        // 最後のスポットからの目的地への交通手段（目的地へ）- スポットがある場合のみ
        if (planData.destination.transports && createdPlanSpots.length > 0) {
          const destinationTransport = planData.destination.transports;
          const lastSpot = createdPlanSpots[createdPlanSpots.length - 1];
          await executor.insert(transport).values({
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
            await executor
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

          await executor.insert(transport).values({
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
      return await executor.query.trip.findFirst({
        where: eq(trip.id, newTrip.id),
        with: {
          plans: {
            with: {
              planSpots: true,
            },
          },
        },
      });
    };

    let createdTrip;
    try {
      createdTrip = await db.transaction(async (tx) => persistTrip(tx));
    } catch (error) {
      if (error instanceof Error && error.message.includes('No transactions support in neon-http driver')) {
        console.log('Transaction fallback: executing create trip flow without transaction.');
        createdTrip = await persistTrip(db);
      } else {
        throw error;
      }
    }

    // 作成した旅行計画のidを渡してリダイレクト用に使用させる
    if (createdTrip) {
      const responseTrip = {
        id: createdTrip.id,
      };
      return c.json(responseTrip, 201);
    }
  },

  // 旅行計画の更新
  updateTrip: async (c: Context) => {
    const response = await updateTrip(c);
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
