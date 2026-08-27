import { eq, lt, count, sql, inArray, and, not, InferSelectModel } from 'drizzle-orm';
import { trip, plan, planLocation, planLocationNearestStation, planSpot, planSpotNearestStation, AnyDbType } from '@db';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { TripSchema } from '@shared/trip/schema';
import { PlanLocationType } from '@shared/planlocation/types';
import { TransportMethodIdMapping } from '@shared/transports/types';
import { TripType } from '@shared/trip/types';
import { TripSpotType } from '@shared/spot/types';
import { StationTypeSchema } from '@shared/transports/schema';

import { LOCATION_TYPE } from '@/models/planLocation';
import { getUserId } from '@/middleware/auth';

import { createPlanLocation } from './planLocation';
import { createPlanSpot } from './spot';
import { validateLimit } from './limit';

// PlanSpotとその最寄駅情報（drizzleのwith句で取得した結果の型）
type PlanSpotWithNearestStations = InferSelectModel<typeof planSpot> & {
  nearestStations: InferSelectModel<typeof planSpotNearestStation>[];
};

// PlanLocation（出発地・目的地）とその最寄駅情報（drizzleのwith句で取得した結果の型）
type PlanLocationWithNearestStation = InferSelectModel<typeof planLocation> & {
  nearestStation: InferSelectModel<typeof planLocationNearestStation>[];
};

// Planとその配下のPlanSpot・PlanLocation（drizzleのwith句で取得した結果の型）
type PlanWithRelations = InferSelectModel<typeof plan> & {
  planSpots: PlanSpotWithNearestStations[];
  planLocations: PlanLocationWithNearestStation[];
};

// Tripとその配下のPlan（drizzleのwith句で取得した結果の型）
type TripWithRelations = InferSelectModel<typeof trip> & {
  plans: PlanWithRelations[];
};

export const createTrip = async (db: AnyDbType, c: Context) => {
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
  await validateLimit(db, userId, tripData);

  const tripId = await db.transaction(async (tx) => {
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

    // Plans と PlanSpots を作成
    for (const planData of tripData.plans) {
      const [newPlan] = await tx
        .insert(plan)
        .values({
          tripId: newTrip.id,
          date: planData.date,
          memo: planData.memo ?? null,
        })
        .returning();

      // PlanSpotsを作成
      await createPlanSpot(tx, newPlan.id, planData.spots);

      // 出発地の情報を登録する
      await createPlanLocation(tx, newPlan.id, userId, planData.departure);
      // 目的地の情報を登録する
      await createPlanLocation(tx, newPlan.id, userId, planData.destination);
    }
    return newTrip.id;
  });

  return tripId;
};

/**
 * ユーザーIDごとの旅行プランの数を取得
 * @param userIds clerkに登録されているuserIdの配列
 * @returns ユーザーIDをキー、旅行プランの数を値とするオブジェクト
 */
export const countPlanByUserId = async (db: AnyDbType, userIds: string[]) => {
  if (userIds.length === 0) {
    return {};
  }

  const counts = await db
    .select({
      userId: trip.userId,
      count: count(),
    })
    .from(trip)
    .where(inArray(trip.userId, userIds))
    .groupBy(trip.userId);

  const countMap: Record<string, number> = {};
  counts.forEach((item) => {
    countMap[item.userId] = item.count;
  });

  return countMap;
};

export const updateTrip = async (transactionDb: AnyDbType, c: Context) => {
  const userId = getUserId(c);
  const tripId = parseInt(c.req.param('id'));
  if (!userId) {
    throw new HTTPException(401, { message: 'Unauthorized error' });
  }

  const body = await c.req.json();
  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }

  if (!tripId) {
    throw new HTTPException(400, { message: 'TripId is required' });
  }

  const result = TripSchema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  // tripIdに紐づく旅行プランの更新者が現在のユーザーであることを確認
  const existingTrip = await transactionDb
    .select({ userId: trip.userId })
    .from(trip)
    .where(eq(trip.id, tripId))
    .limit(1);
  if (existingTrip.length === 0) {
    throw new HTTPException(404, { message: 'Trip not found' });
  }
  if (existingTrip[0].userId !== userId) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const tripData = result.data;

  // 上限チェック
  await validateLimit(transactionDb, userId, tripData);

  await transactionDb.transaction(async (tx) => {
    await tx
      .update(trip)
      .set({ ...tripData })
      .where(and(eq(trip.id, tripId), eq(trip.userId, userId)));

    // planLocationの更新
    for (const pn of tripData.plans) {
      const currentPlanData = await tx
        .select({ id: plan.id })
        .from(plan)
        .where(and(eq(plan.tripId, tripId), eq(plan.date, pn.date)));
      // 該当するプランデータがない場合はスキップ
      if (currentPlanData.length === 0) {
        continue;
      }
      // 出発地の更新
      const [updatedPlanDepartureLocation] = await tx
        .update(planLocation)
        .set({
          name: pn.departure.name,
          latitude: pn.departure.latitude,
          longitude: pn.departure.longitude,
          time: pn.departure.time,
        })
        .where(
          and(eq(planLocation.planId, currentPlanData[0].id), eq(planLocation.locationType, LOCATION_TYPE.DEPARTURE)),
        )
        .returning();

      // 出発地の更新が失敗した場合はエラーを返す
      if (!updatedPlanDepartureLocation) {
        throw new HTTPException(500, { message: 'Departure planLocation not found' });
      }

      if (pn.departure.nearestStation?.placeId) {
        // 出発地の最寄駅情報を更新
        await tx
          .insert(planLocationNearestStation)
          .values({
            planLocationId: updatedPlanDepartureLocation.id,
            placeId: pn.departure.nearestStation?.placeId,
            stationType: pn.departure.nearestStation?.stationType,
            transitTime: pn.departure.nearestStation?.transitTime,
            scheduledDepartureTime: pn.departure.nearestStation?.scheduledDepartureTime,
            memo: pn.departure.nearestStation?.memo,
          })
          .onConflictDoUpdate({
            target: [planLocationNearestStation.planLocationId],
            set: {
              placeId: pn.departure.nearestStation?.placeId,
              stationType: pn.departure.nearestStation?.stationType,
              transitTime: pn.departure.nearestStation?.transitTime,
              scheduledDepartureTime: pn.departure.nearestStation?.scheduledDepartureTime,
              memo: pn.departure.nearestStation?.memo,
            },
          });
      }

      if (!pn.departure.nearestStation?.placeId) {
        await tx
          .delete(planLocationNearestStation)
          .where(eq(planLocationNearestStation.planLocationId, updatedPlanDepartureLocation.id));
      }

      // 目的地の更新
      const [updatedPlanDestinationLocation] = await tx
        .update(planLocation)
        .set({
          name: pn.destination.name,
          latitude: pn.destination.latitude,
          longitude: pn.destination.longitude,
          time: pn.destination.time,
        })
        .where(
          and(eq(planLocation.planId, currentPlanData[0].id), eq(planLocation.locationType, LOCATION_TYPE.DESTINATION)),
        )
        .returning();

      // 出発地の更新が失敗した場合はエラーを返す
      if (!updatedPlanDestinationLocation) {
        throw new HTTPException(500, { message: 'Destination planLocation not found' });
      }

      // 出発地の最寄駅情報を更新
      if (pn.destination.nearestStation?.placeId) {
        await tx
          .insert(planLocationNearestStation)
          .values({
            planLocationId: updatedPlanDestinationLocation.id,
            placeId: pn.destination.nearestStation?.placeId,
            stationType: pn.destination.nearestStation?.stationType,
            transitTime: pn.destination.nearestStation?.transitTime,
            scheduledDepartureTime: pn.destination.nearestStation?.scheduledDepartureTime,
            memo: pn.destination.nearestStation?.memo,
          })
          .onConflictDoUpdate({
            target: [planLocationNearestStation.planLocationId],
            set: {
              placeId: pn.destination.nearestStation?.placeId,
              stationType: pn.destination.nearestStation?.stationType,
              transitTime: pn.destination.nearestStation?.transitTime,
              scheduledDepartureTime: pn.destination.nearestStation?.scheduledDepartureTime,
              memo: pn.destination.nearestStation?.memo,
            },
          });
      }

      if (!pn.destination.nearestStation?.placeId) {
        await tx
          .delete(planLocationNearestStation)
          .where(eq(planLocationNearestStation.planLocationId, updatedPlanDestinationLocation.id));
      }

      // スポットの確認
      const requestSpotIds = pn.spots.map((s) => s.id);
      for (const spot of pn.spots) {
        // スポットのupsertを行う（upsertした行を取得してそのidを後続処理で使う）
        const [upsertedPlanSpot] = await tx
          .insert(planSpot)
          .values({
            planId: currentPlanData[0].id,
            spotId: spot.id,
            memo: spot.memo,
            order: spot.order,
            stayStart: spot.stayStart,
            stayEnd: spot.stayEnd,
            stayDuration: spot.stayDuration ?? 0,
          })
          .onConflictDoUpdate({
            target: [planSpot.planId, planSpot.spotId],
            set: {
              memo: spot.memo,
              order: spot.order,
              stayStart: spot.stayStart,
              stayEnd: spot.stayEnd,
              stayDuration: spot.stayDuration ?? 0,
            },
          })
          .returning();

        // スポットの最寄駅情報を更新
        if (spot.nearestStation?.placeId && spot.nearestStation.stationType) {
          await tx
            .insert(planSpotNearestStation)
            .values({
              planSpotId: upsertedPlanSpot.id,
              placeId: spot.nearestStation?.placeId,
              stationType: spot.nearestStation?.stationType,
              transitTime: spot.nearestStation?.transitTime ?? null,
              scheduledDepartureTime: spot.nearestStation?.scheduledDepartureTime ?? null,
              memo: spot.nearestStation?.memo ?? null,
            })
            .onConflictDoUpdate({
              target: [planSpotNearestStation.planSpotId],
              set: {
                placeId: spot.nearestStation?.placeId,
                stationType: spot.nearestStation?.stationType,
                transitTime: spot.nearestStation?.transitTime ?? null,
                scheduledDepartureTime: spot.nearestStation?.scheduledDepartureTime ?? null,
                memo: spot.nearestStation?.memo ?? null,
              },
            });
        } else {
          await tx.delete(planSpotNearestStation).where(eq(planSpotNearestStation.planSpotId, upsertedPlanSpot.id));
        }
      }

      // DBに登録されているが、渡ってきたデータにないスポットを削除する
      if (requestSpotIds.length === 0) {
        await tx.delete(planSpot).where(eq(planSpot.planId, currentPlanData[0].id));
      } else {
        await tx
          .delete(planSpot)
          .where(and(eq(planSpot.planId, currentPlanData[0].id), not(inArray(planSpot.spotId, requestSpotIds))));
      }
    }

    // 既に登録されている日付データ
    const existedPlanDate = await tx.select({ id: plan.id, date: plan.date }).from(plan).where(eq(plan.tripId, tripId));
    // リクエストから飛んできた日付データ
    const newPlanDateList = tripData.plans.map((plan) => plan.date);

    // DBに登録されている日付とリクエストから渡ってきた日付を比較して、新旧の日付情報を抽出
    const deletedPlanDateList = existedPlanDate.filter((plan) => !newPlanDateList.includes(plan.date));
    const newPlanData = tripData.plans.filter((plan) => !existedPlanDate.map((pn) => pn.date).includes(plan.date));

    // 既に登録されているプランデータのメモを更新
    for (const planData of tripData.plans) {
      await tx
        .update(plan)
        .set({ memo: planData.memo ?? null })
        .where(and(eq(plan.tripId, tripId), eq(plan.date, planData.date)));
    }

    // 削除対象の日付のプランデータを削除
    await tx.delete(plan).where(
      and(
        eq(plan.tripId, tripId),
        inArray(
          plan.date,
          deletedPlanDateList.map((pn) => pn.date),
        ),
      ),
    );

    // 追加対象のプランデータを登録
    for (const planData of newPlanData) {
      const [newPlan] = await tx
        .insert(plan)
        .values({
          tripId: tripId,
          date: planData.date,
          memo: planData.memo ?? null,
        })
        .returning();

      const createdPlanSpots = [];
      for (const spotData of planData.spots) {
        const [newPlanSpot] = await tx
          .insert(planSpot)
          .values({
            planId: newPlan.id,
            spotId: spotData.id,
            stayStart: spotData.stayStart,
            stayEnd: spotData.stayEnd,
            stayDuration: spotData.stayDuration ?? 60,
            memo: spotData.memo ?? null,
            order: spotData.order,
          })
          .returning();
        createdPlanSpots.push(newPlanSpot);
      }

      // 出発地の情報を登録する
      await createPlanLocation(tx, newPlan.id, userId, planData.departure);
      // 目的地の情報を登録する
      await createPlanLocation(tx, newPlan.id, userId, planData.destination);

      // // ユーザーのお気に入り地点が登録された場合は、使用回数を更新する
      // if (planData.departure.userLocationId) {
      //   await tx
      //     .update(userLocation)
      //     .set({ usageCount: (planData.departure.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
      //     .where(and(eq(userLocation.id, planData.departure.userLocationId), eq(userLocation.userId, userId)));
      // }
      // // 最後のスポットからの目的地への交通手段（目的地へ）- スポットがある場合のみ
      // // ユーザーのお気に入り地点が登録された場合は、使用回数を更新する
      // if (planData.destination.userLocationId) {
      //   await tx
      //     .update(userLocation)
      //     .set({ usageCount: (planData.destination.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
      //     .where(and(eq(userLocation.id, planData.destination.userLocationId), eq(userLocation.userId, userId)));
      // }
    }
  });
  return { id: tripId };
};

/**
 * 総プラン数と前月からの増減数、平均旅程数を取得
 * @returns プラン統計情報
 */
export const getTripStatistics = async (db: AnyDbType) => {
  // プランの総数を取得
  const [totalResult] = await db.select({ count: count() }).from(trip);
  const totalPlans = totalResult?.count ?? 0;

  // 当月の初日（0時0分0秒）を取得
  const firstDayOfCurrentMonth = new Date();
  firstDayOfCurrentMonth.setDate(1);
  firstDayOfCurrentMonth.setHours(0, 0, 0, 0);

  // 前月までのプラン数を取得
  const [lastMonthResult] = await db
    .select({ count: count() })
    .from(trip)
    .where(lt(trip.createdAt, firstDayOfCurrentMonth.toISOString()));
  const lastMonthPlans = lastMonthResult?.count ?? 0;

  // プランあたりの平均旅程数を取得
  const result = await db.execute<{ avg_days_per_plan: number }>(sql`
    SELECT
      COALESCE(plan_count / NULLIF(trip_count, 0), 0) AS avg_days_per_plan
    FROM (
      SELECT
        COUNT(DISTINCT p."tripId") AS trip_count,
        COUNT(p.id) AS plan_count
      FROM "public"."Trip" t
      LEFT JOIN "public"."Plan" p ON p."tripId" = t.id
    ) sub
  `);
  const averageDatePerUserPlan = Number(result.rows?.[0]?.avg_days_per_plan) || 0;

  return {
    totalPlans,
    planIncreaseFromLastMonth: totalPlans - lastMonthPlans,
    averageDatePerUserPlan,
  };
};

export const getTripDetailById = async (db: AnyDbType, tripId: number, userId: string) => {
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
          planLocations: {
            with: {
              nearestStation: true,
            },
          },
        },
      },
    },
  });

  if (!targetTrip) {
    throw new HTTPException(404, { message: 'No trip found' });
  }

  const response: TripType = {
    ...convertTripData(targetTrip),
  };

  for (const plan of targetTrip.plans) {
    const departureLocation = plan.planLocations.find((pl) => pl.locationType === LOCATION_TYPE.DEPARTURE);
    if (!departureLocation) {
      throw new HTTPException(500, { message: 'Departure planLocation not found' });
    }
    const destinationLocation = plan.planLocations.find((pl) => pl.locationType === LOCATION_TYPE.DESTINATION);
    if (!destinationLocation) {
      throw new HTTPException(500, { message: 'Destination planLocation not found' });
    }

    response.plans.push({
      date: plan.date,
      memo: plan.memo ?? '',
      spots: convertPlanSpotData(plan.planSpots),
      departure: {
        ...convertPlanLocationData([departureLocation])[0],
      },
      destination: {
        ...convertPlanLocationData([destinationLocation])[0],
      },
    });
  }

  return response;
};

const convertTripData = (rawTripData: TripWithRelations): TripType => {
  return {
    title: rawTripData.title,
    imageUrl: rawTripData.imageUrl ?? undefined,
    startDate: rawTripData.startDate,
    endDate: rawTripData.endDate,
    plans: [],
  };
};

const convertPlanSpotData = (rawPlanSpotData: PlanSpotWithNearestStations[]): TripSpotType[] => {
  return rawPlanSpotData.map((planSpot) => {
    const nearestStation = planSpot.nearestStations?.[0];

    return {
      id: planSpot.spotId,
      stayStart: planSpot.stayStart,
      stayEnd: planSpot.stayEnd,
      stayDuration: planSpot.stayDuration,
      order: planSpot.order,
      memo: planSpot.memo ?? '',
      travelTime: planSpot.travelTime ?? 0,
      transportMethodId: planSpot.transportMethodId ?? 0,
      transportMethod: TransportMethodIdMapping[planSpot.transportMethodId ?? 0],
      nearestStation: nearestStation
        ? {
            planSpotId: nearestStation.planSpotId,
            placeId: nearestStation.placeId,
            stationType: nearestStation.stationType ?? StationTypeSchema.enum.OTHER,
            transitTime: nearestStation.transitTime ?? 0,
            scheduledDepartureTime: nearestStation.scheduledDepartureTime ?? '',
            memo: nearestStation.memo ?? '',
          }
        : undefined,
    };
  });
};

const convertPlanLocationData = (rawPlanLocationData: PlanLocationWithNearestStation[]): PlanLocationType[] => {
  return rawPlanLocationData.map((planLocation) => {
    const nearestStation = planLocation.nearestStation?.[0];

    return {
      name: planLocation.name,
      latitude: planLocation.latitude,
      longitude: planLocation.longitude,
      planId: planLocation.planId,
      time: planLocation.time,
      locationType: planLocation.locationType,
      travelTime: planLocation.travelTime,
      transportMethodId: planLocation.transportMethodId,
      transportMethod: TransportMethodIdMapping[planLocation.transportMethodId ?? 0],
      nearestStation: nearestStation
        ? {
            planSpotId: undefined,
            placeId: nearestStation.placeId,
            stationType: nearestStation.stationType ?? StationTypeSchema.enum.OTHER,
            transitTime: nearestStation.transitTime ?? 0,
            scheduledDepartureTime: nearestStation.scheduledDepartureTime ?? '',
            memo: nearestStation.memo ?? '',
          }
        : undefined,
    };
  });
};
