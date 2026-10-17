import { eq, and, desc, asc, sql, InferSelectModel } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { PlanLocationType } from '@shared/planlocation/types';

import { plan, planLocation, planLocationNearestStation, trip, userLocation, userLocationNearestStation } from '@/db';
import type { AnyDbType } from '@/db';
import { CreatePlanLocationType, LocationType } from '@/models/planLocation';
import { getLocationCipher, LocationCipher } from '@/lib/locationCipher';
import {
  decryptPlaceId,
  decryptPlanLocationSecret,
  decryptUserLocationSecret,
  encryptPlaceId,
  encryptPlanLocationSecret,
} from '@/lib/locationPayload';

function hasSelect(value: unknown): value is AnyDbType {
  return !!value && typeof value === 'object' && 'select' in (value as Record<string, unknown>);
}

/**
 * デフォルトの地点名を生成
 * @param locationType 地点の種別
 * @returns 「YYYY-MM-DD_出発地」または「YYYY-MM-DD_目的地」
 */
function generateDefaultName(locationType: LocationType): string {
  const today = new Date().toISOString().split('T')[0];
  const suffix = locationType === 'DEPARTURE' ? '出発地' : '目的地';
  return `${today}_${suffix}`;
}

function defaultTimeByLocationType(locationType: LocationType): string {
  return locationType === 'DESTINATION' ? '18:00' : '09:00';
}

type DbLike = Pick<AnyDbType, 'select' | 'insert' | 'update' | 'delete' | 'query'>;

/**
 * PlanLocationの行を復号し、従来と同じ形（座標・移動時間を含む）に変換する
 * 暗号化カラムはレスポンスに含めない
 */
export async function toPlanLocationResponse(cipher: LocationCipher, row: InferSelectModel<typeof planLocation>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encryptedData, ...rest } = row;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isEncrypted, lastSpotId, ...secret } = await decryptPlanLocationSecret(cipher, row);
  return { ...rest, ...secret };
}

/**
 * @param lastSpotId 目的地の場合のみ: 移動時間を移し替えた元の最後のスポットID（trip.ts の moveLastSpotTravelTimeToDestination）
 */
export async function createPlanLocation(
  db: DbLike,
  planId: number,
  userId: string,
  data: PlanLocationType,
  lastSpotId?: string,
) {
  const cipher = getLocationCipher();
  const [newPlanLocation] = await db
    .insert(planLocation)
    .values({
      planId: planId,
      userId: userId,
      name: data.name,
      encryptedData: await encryptPlanLocationSecret(cipher, {
        latitude: data.latitude,
        longitude: data.longitude,
        travelTime: data.travelTime ?? 0,
        lastSpotId,
      }),
      // 平文カラムは使わない（default 0 が入らないように明示する）
      travelTime: null,
      time: data.time,
      locationType: data.locationType,
      transportMethodId: data.transportMethodId,
    })
    .returning();

  if (data.nearestStation?.placeId && data.nearestStation?.stationType) {
    await db.insert(planLocationNearestStation).values({
      planLocationId: newPlanLocation.id,
      encryptedPlaceId: await encryptPlaceId(cipher, data.nearestStation.placeId),
      stationType: data.nearestStation.stationType,
      transitTime: data.nearestStation.transitTime ?? null,
      scheduledDepartureTime: data.nearestStation.scheduledDepartureTime ?? null,
      waitingTime: data.nearestStation.waitingTime ?? null,
      memo: data.nearestStation.memo ?? null,
    });
  }
}

/**
 * 出発地・目的地の候補を取得
 * UserLocation（お気に入り）とPlanLocation（履歴）の両方を返す
 *
 * @param userId ユーザーID
 * @param options フィルタリングオプション
 * @returns { favorites: UserLocation[], history: PlanLocation[] }
 */
export async function getPlanLocationCandidates(
  database: AnyDbType,
  databaseOrUserId: AnyDbType | string,
  userIdOrOptions?:
    | string
    | {
        locationType?: LocationType;
        search?: string;
        limit?: number;
      },
  maybeOptions?: {
    locationType?: LocationType;
    search?: string;
    limit?: number;
  },
) {
  // const database = hasSelect(databaseOrUserId) ? databaseOrUserId : db;
  const userId = hasSelect(databaseOrUserId) ? (userIdOrOptions as string) : (databaseOrUserId as string);
  const options = hasSelect(databaseOrUserId)
    ? maybeOptions
    : (userIdOrOptions as { locationType?: LocationType; search?: string; limit?: number } | undefined);

  const limit = options?.limit ?? 10;

  // UserLocationを取得（お気に入り）- 使用回数降順 → ID昇順
  const favorites = await database
    .select()
    .from(userLocation)
    .leftJoin(userLocationNearestStation, eq(userLocationNearestStation.userLocationId, userLocation.id))
    .where(eq(userLocation.userId, userId))
    .orderBy(desc(userLocation.usageCount), asc(userLocation.id))
    .limit(limit);

  // PlanLocationを取得（履歴） ID昇順
  const historyConditions = [eq(planLocation.userId, userId), eq(sql`${planLocation.planId} IS NOT NULL`, true)];

  if (options?.locationType) {
    historyConditions.push(eq(planLocation.locationType, options.locationType));
  }

  const history = await database
    .select()
    .from(planLocation)
    .leftJoin(plan, eq(plan.id, planLocation.planId))
    .leftJoin(trip, eq(trip.id, plan.tripId))
    .where(and(...historyConditions))
    .orderBy(asc(planLocation.id))
    .limit(limit);

  // レスポンス形式に変換（座標・ラベル・最寄駅は復号する）
  const cipher = getLocationCipher();
  return {
    favorites: await Promise.all(
      favorites.map(async (fav) => {
        const secret = await decryptUserLocationSecret(cipher, fav.UserLocation);
        const station = fav.UserLocationNearestStation;
        return {
          planLocationId: null,
          userLocationId: fav.UserLocation.id,
          name: fav.UserLocation.name,
          latitude: secret.latitude,
          longitude: secret.longitude,
          label: secret.label,
          usageCount: fav.UserLocation.usageCount,
          isDefault: fav.UserLocation.isDefault,
          nearestStation: station
            ? {
                placeId: await decryptPlaceId(cipher, station),
                stationType: station.stationType,
              }
            : null,
          locationType: 'BOTH' as const,
        };
      }),
    ),
    history: await Promise.all(
      history.map(async (hist) => {
        const secret = await decryptPlanLocationSecret(cipher, hist.PlanLocation);
        return {
          planLocationId: hist.PlanLocation.id,
          userLocationId: null,
          name: hist.PlanLocation.name,
          latitude: secret.latitude,
          longitude: secret.longitude,
          label: '',
          usageCount: 0,
          isDefault: false,
          locationType: hist.PlanLocation.locationType,
          planName: hist.Trip?.title || '',
        };
      }),
    ),
  };
}

/**
 * PlanLocationを作成または更新
 * - planLocationIdがある場合は使用回数を更新
 * - planLocationIdがない場合は新規作成
 * @param userId ユーザーID
 * @param data 作成/更新データ
 */
export async function createOrUpdatePlanLocation(
  database: AnyDbType,
  databaseOrUserId: AnyDbType | string,
  userIdOrData: string | CreatePlanLocationType,
  maybeData?: CreatePlanLocationType,
) {
  const userId = hasSelect(databaseOrUserId) ? (userIdOrData as string) : (databaseOrUserId as string);
  const data = hasSelect(databaseOrUserId)
    ? (maybeData as CreatePlanLocationType)
    : (userIdOrData as CreatePlanLocationType);

  const cipher = getLocationCipher();

  if (data.planLocationId) {
    const [existing] = await database
      .select()
      .from(planLocation)
      .where(and(eq(planLocation.id, data.planLocationId), eq(planLocation.userId, userId)))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: '指定されたIDが存在しないか、更新権限がありません' });
    }
    // 移動時間はこのAPIでは変更しないため、既存の値（復号したもの）を引き継ぐ
    const existingSecret = await decryptPlanLocationSecret(cipher, existing);

    const [updated] = await database
      .update(planLocation)
      .set({
        name: data.name,
        encryptedData: await encryptPlanLocationSecret(cipher, {
          latitude: data.latitude,
          longitude: data.longitude,
          travelTime: existingSecret.travelTime,
          lastSpotId: existingSecret.lastSpotId,
        }),
        // 平文カラムは使わない（一括変換前のデータもここで暗号化に置き換える）
        latitude: null,
        longitude: null,
        travelTime: null,
        time: data.time ?? defaultTimeByLocationType(data.locationType),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(planLocation.id, data.planLocationId), eq(planLocation.userId, userId)))
      .returning();
    return toPlanLocationResponse(cipher, updated);
  }
  // 新規作成
  const defaultName = data.name || generateDefaultName(data.locationType);

  const [created] = await database
    .insert(planLocation)
    .values({
      userId,
      name: defaultName,
      encryptedData: await encryptPlanLocationSecret(cipher, {
        latitude: data.latitude,
        longitude: data.longitude,
        travelTime: 0,
      }),
      travelTime: null,
      time: data.time ?? defaultTimeByLocationType(data.locationType),
      locationType: data.locationType,
      planId: data.planId,
    })
    .returning();

  // 新規で追加された場合はUserLocationの使用回数を更新
  if (data.userLocationId && !data.planLocationId) {
    await database
      .update(userLocation)
      .set({ usageCount: sql`${userLocation.usageCount} + 1`, updatedAt: new Date().toISOString() })
      .where(and(eq(userLocation.id, data.userLocationId), eq(userLocation.userId, userId)));
  }

  return toPlanLocationResponse(cipher, created);
}

/**
 * PlanLocationを削除
 * @returns 削除された地点、または存在しない/権限がない場合はnull
 */
export async function deletePlanLocation(database: AnyDbType, userIdOrId: string | number, maybeId?: number) {
  const userId = userIdOrId as string;
  const id = maybeId as number;

  // 自分の地点かどうか確認
  const existing = await database
    .select()
    .from(planLocation)
    .where(and(eq(planLocation.id, id), eq(planLocation.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    return null;
  }

  const [deleted] = await database.delete(planLocation).where(eq(planLocation.id, id)).returning();

  return toPlanLocationResponse(getLocationCipher(), deleted);
}
