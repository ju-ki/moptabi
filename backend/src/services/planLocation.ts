import { eq, and, desc, asc, sql } from 'drizzle-orm';

import { db, plan, planLocation, trip, userLocation } from '@/db';
import type { AnyDbType } from '@/db';
import { CreatePlanLocationType, LocationType } from '@/models/planLocation';

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

/**
 * 出発地・目的地の候補を取得
 * UserLocation（お気に入り）とPlanLocation（履歴）の両方を返す
 *
 * @param userId ユーザーID
 * @param options フィルタリングオプション
 * @returns { favorites: UserLocation[], history: PlanLocation[] }
 */
export async function getPlanLocationCandidates(
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
  const database = hasSelect(databaseOrUserId) ? databaseOrUserId : db;
  const userId = hasSelect(databaseOrUserId) ? (userIdOrOptions as string) : (databaseOrUserId as string);
  const options = hasSelect(databaseOrUserId)
    ? maybeOptions
    : (userIdOrOptions as { locationType?: LocationType; search?: string; limit?: number } | undefined);

  const limit = options?.limit ?? 10;

  // UserLocationを取得（お気に入り）- 使用回数降順 → ID昇順
  const favorites = await database
    .select()
    .from(userLocation)
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

  // レスポンス形式に変換
  return {
    favorites: favorites.map((fav) => ({
      planLocationId: null,
      userLocationId: fav.id,
      name: fav.name,
      latitude: fav.latitude,
      longitude: fav.longitude,
      address: fav.address,
      label: fav.label,
      usageCount: fav.usageCount,
      isDefault: fav.isDefault,
      locationType: 'BOTH' as const,
    })),
    history: history.map((hist) => ({
      planLocationId: hist.PlanLocation.id,
      userLocationId: null,
      name: hist.PlanLocation.name,
      latitude: hist.PlanLocation.latitude,
      longitude: hist.PlanLocation.longitude,
      address: hist.PlanLocation.address,
      label: '',
      usageCount: 0,
      isDefault: false,
      locationType: hist.PlanLocation.locationType,
      planName: hist.Trip?.title || '',
    })),
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
  databaseOrUserId: AnyDbType | string,
  userIdOrData: string | CreatePlanLocationType,
  maybeData?: CreatePlanLocationType,
) {
  const database = hasSelect(databaseOrUserId) ? databaseOrUserId : db;
  const userId = hasSelect(databaseOrUserId) ? (userIdOrData as string) : (databaseOrUserId as string);
  const data = hasSelect(databaseOrUserId)
    ? (maybeData as CreatePlanLocationType)
    : (userIdOrData as CreatePlanLocationType);

  if (data.planLocationId) {
    const [updated] = await database
      .update(planLocation)
      .set({
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address ?? null,
        time: data.time ?? defaultTimeByLocationType(data.locationType),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(planLocation.id, data.planLocationId), eq(planLocation.userId, userId)))
      .returning();
    return updated;
  }
  // 新規作成
  const defaultName = data.name || generateDefaultName(data.locationType);

  const [created] = await database
    .insert(planLocation)
    .values({
      userId,
      name: defaultName,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address ?? null,
      time: data.time ?? defaultTimeByLocationType(data.locationType),
      locationType: data.locationType,
      planId: data.planId,
    })
    .returning();
  return created;
}

/**
 * PlanLocationを削除
 * @returns 削除された地点、または存在しない/権限がない場合はnull
 */
export async function deletePlanLocation(
  databaseOrUserId: AnyDbType | string,
  userIdOrId: string | number,
  maybeId?: number,
) {
  const database = hasSelect(databaseOrUserId) ? databaseOrUserId : db;
  const userId = hasSelect(databaseOrUserId) ? (userIdOrId as string) : (databaseOrUserId as string);
  const id = hasSelect(databaseOrUserId) ? (maybeId as number) : (userIdOrId as number);

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

  return deleted;
}
