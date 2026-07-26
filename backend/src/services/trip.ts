import { eq, lt, count, sql, inArray, and, not } from 'drizzle-orm';
import {
  db,
  trip,
  plan,
  planLocation,
  planLocationNearestStation,
  planSpot,
  planSpotNearestStation,
  transport,
  userLocation,
  getDbFromContext,
} from '@db';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getUserId } from '@/middleware/auth';
import { TripSchema } from '@/models/trip';
import { LOCATION_TYPE } from '@/models/planLocation';

import { validateLimit } from './limit';

const DEFAULT_DEPARTURE_TIME = '09:00';
const DEFAULT_DESTINATION_TIME = '18:00';

/**
 * ユーザーIDごとの旅行プランの数を取得
 * @param userIds clerkに登録されているuserIdの配列
 * @returns ユーザーIDをキー、旅行プランの数を値とするオブジェクト
 */
export const countPlanByUserId = async (userIds: string[]) => {
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

export const updateTrip = async (c: Context) => {
  const transactionDb = getDbFromContext(c, true);
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
  await validateLimit(userId, tripData);

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
            memo: pn.departure.nearestStation?.transitMemo,
          })
          .onConflictDoUpdate({
            target: [planLocationNearestStation.planLocationId],
            set: {
              placeId: pn.departure.nearestStation?.placeId,
              stationType: pn.departure.nearestStation?.stationType,
              transitTime: pn.departure.nearestStation?.transitTime,
              scheduledDepartureTime: pn.departure.nearestStation?.scheduledDepartureTime,
              memo: pn.departure.nearestStation?.transitMemo,
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
            memo: pn.destination.nearestStation?.transitMemo,
          })
          .onConflictDoUpdate({
            target: [planLocationNearestStation.planLocationId],
            set: {
              placeId: pn.destination.nearestStation?.placeId,
              stationType: pn.destination.nearestStation?.stationType,
              transitTime: pn.destination.nearestStation?.transitTime,
              scheduledDepartureTime: pn.destination.nearestStation?.scheduledDepartureTime,
              memo: pn.destination.nearestStation?.transitMemo,
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
              memo: spot.nearestStation?.transitMemo ?? spot.nearestStation?.memo ?? null,
            })
            .onConflictDoUpdate({
              target: [planSpotNearestStation.planSpotId],
              set: {
                placeId: spot.nearestStation?.placeId,
                stationType: spot.nearestStation?.stationType,
                transitTime: spot.nearestStation?.transitTime ?? null,
                scheduledDepartureTime: spot.nearestStation?.scheduledDepartureTime ?? null,
                memo: spot.nearestStation?.transitMemo ?? spot.nearestStation?.memo ?? null,
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

      // 出発地の情報をplanLocationに登録する
      const [newDeparturePlanLocation] = await tx
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
      const [newDestinationPlanLocation] = await tx
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
        await tx.insert(planLocationNearestStation).values({
          planLocationId: newDeparturePlanLocation.id,
          placeId: planData.departure.nearestStation.placeId,
          stationType: planData.departure.nearestStation.stationType,
          transitTime: planData.departure.nearestStation.transitTime ?? null,
          scheduledDepartureTime: planData.departure.nearestStation.scheduledDepartureTime ?? null,
          memo: planData.departure.nearestStation.memo ?? planData.departure.nearestStation.transitMemo ?? null,
        });
      }

      if (planData.destination.nearestStation?.placeId && planData.destination.nearestStation?.stationType) {
        await tx.insert(planLocationNearestStation).values({
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
      const allNearestStations = [...(autoGeneratedNearestStations || []), ...(planData.planSpotNearestStations || [])];

      if (allNearestStations && allNearestStations.length > 0) {
        for (const stationData of allNearestStations) {
          const targetPlanSpotId = planSpotIdByRef.get(stationData.planSpotRef);
          if (!targetPlanSpotId) {
            throw new HTTPException(400, { message: `Unknown planSpotRef: ${stationData.planSpotRef}` });
          }

          await tx.insert(planSpotNearestStation).values({
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
  });

  return { id: tripId };
};

/**
 * 総プラン数と前月からの増減数、平均旅程数を取得
 * @returns プラン統計情報
 */
export const getTripStatistics = async () => {
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
