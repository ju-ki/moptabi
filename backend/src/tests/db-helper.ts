/**
 * Drizzle ORM テストヘルパー
 * テスト用のDB操作ユーティリティ
 */
import { eq, inArray, like, not, and } from 'drizzle-orm';
import {
  db,
  user,
  trip,
  plan,
  planSpot,
  tripInfo,
  wishlist,
  nearestStation,
  userNotification,
  notification,
  transport,
  userLocation,
  planLocation,
  planLocationNearestStation,
  planSpotNearestStation,
} from '@db';

// DBインスタンスを再エクスポート
export { db };

// スキーマを再エクスポート
export {
  user,
  trip,
  plan,
  planSpot,
  tripInfo,
  wishlist,
  nearestStation,
  userNotification,
  notification,
  transport,
  userLocation,
  planLocation,
  planLocationNearestStation,
  planSpotNearestStation,
};

// Drizzle演算子を再エクスポート
export { eq, inArray, like, not, and };

/**
 * DB接続（Drizzleは自動接続のため何もしない）
 */
export async function connectDb(): Promise<void> {
  // Drizzleは自動接続
}

/**
 * DB切断（グローバルインスタンスのため何もしない）
 */
export async function disconnectDb(): Promise<void> {
  // 自動クリーンアップ
}

/**
 * 全テストデータを削除（外部キー制約を考慮した順序）
 */
export async function clearAllTestData(): Promise<void> {
  try {
    await db.delete(transport);
    await db.delete(planSpotNearestStation);
    await db.delete(planSpot);
    await db.delete(tripInfo);
    await db.delete(planLocation);
    await db.delete(plan);
    await db.delete(trip);
    await db.delete(wishlist);
    await db.delete(nearestStation);
    await db.delete(userNotification);
    await db.delete(notification);
    await db.delete(userLocation);
    // userは削除しない（テスト間で共有）
    // spot/spotMetaテーブルはNo.230対応で削除済み
  } catch (err) {
    console.warn('clearAllTestData: failed:', (err as Error).message);
  }
}

/**
 * 特定ユーザーのテストデータを削除
 */
export async function clearUserTestData(userId: string, deleteSpots: boolean | string = false): Promise<void> {
  try {
    // Trip関連のIDを取得
    const trips = await db.select({ id: trip.id }).from(trip).where(eq(trip.userId, userId));
    const tripIds = trips.map((t) => t.id);

    let wishlistSpotIds: string[] = [];
    let planSpotIdList: string[] = [];

    if (deleteSpots) {
      const wishlists = await db.select({ spotId: wishlist.spotId }).from(wishlist).where(eq(wishlist.userId, userId));
      wishlistSpotIds = wishlists.map((w) => w.spotId);
    }

    if (tripIds.length > 0) {
      const plans = await db.select({ id: plan.id }).from(plan).where(inArray(plan.tripId, tripIds));
      const planIds = plans.map((p) => p.id);

      if (planIds.length > 0) {
        if (deleteSpots) {
          const planSpots = await db
            .select({ spotId: planSpot.spotId })
            .from(planSpot)
            .where(inArray(planSpot.planId, planIds));
          planSpotIdList = planSpots.map((ps) => ps.spotId);
        }
        await db.delete(transport).where(inArray(transport.planId, planIds));
        const planSpotsForDelete = await db
          .select({ id: planSpot.id })
          .from(planSpot)
          .where(inArray(planSpot.planId, planIds));
        const planSpotIdsForDelete = planSpotsForDelete.map((ps) => ps.id);
        if (planSpotIdsForDelete.length > 0) {
          await db
            .delete(planSpotNearestStation)
            .where(inArray(planSpotNearestStation.planSpotId, planSpotIdsForDelete));
        }
        await db.delete(planSpot).where(inArray(planSpot.planId, planIds));
      }

      await db.delete(tripInfo).where(inArray(tripInfo.tripId, tripIds));
      await db.delete(plan).where(inArray(plan.tripId, tripIds));
      await db.delete(trip).where(eq(trip.userId, userId));
    }

    await db.delete(wishlist).where(eq(wishlist.userId, userId));
    await db.delete(userNotification).where(eq(userNotification.userId, userId));
    await db.delete(userLocation).where(eq(userLocation.userId, userId));
    await db.delete(planLocation).where(eq(planLocation.userId, userId));
  } catch (err) {
    console.warn(`clearUserTestData: failed for user ${userId}:`, (err as Error).message);
  }
}

/**
 * テストユーザーを作成または取得
 */
export async function createTestUser(userId: string, role: 'ADMIN' | 'USER' | 'GUEST' = 'USER') {
  const existing = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db.insert(user).values({ id: userId, role }).returning();
  return created;
}

/**
 * テスト用ユーザーを作成（詳細パラメータ）
 */
export async function createUserWithDetails(data: {
  id: string;
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'USER' | 'GUEST';
  lastLoginAt?: Date;
  image?: string;
}) {
  const [created] = await db
    .insert(user)
    .values({
      id: data.id,
      name: data.name,
      email: data.email ?? null,
      role: data.role ?? 'USER',
      lastLoginAt: data.lastLoginAt?.toISOString() ?? null,
      image: data.image ?? null,
    })
    .returning();
  return created;
}

/**
 * テスト用ユーザーを除外IDリスト以外削除
 */
export async function deleteUsersExcept(excludeIds: string[]) {
  await db.delete(user).where(not(inArray(user.id, excludeIds)));
}

/**
 * SpotとSpotMetaのモックオブジェクトを返す（DBへの登録は不要）
 *
 * No.230対応: SpotテーブルおよびSpotMetaテーブルは削除済み。
 * placeId（spotId）は Wishlist.spotId / PlanSpot.spotId に直接格納されるため、
 * このヘルパーはDB操作を行わずモックオブジェクトのみ返す。
 * テストコードとの後方互換のために関数シグネチャは維持する。
 */
export async function createSpotWithMeta(
  spotId: string,
  meta?: {
    id?: string;
    name?: string;
    latitude?: number;
    longitude?: number;
    image?: string | null;
    rating?: number | null;
    categories?: string[];
    prefecture?: string | null;
    address?: string | null;
    catchphrase?: string | null;
    description?: string | null;
    openingHours?: unknown;
    url?: string | null;
  },
) {
  // Spot/SpotMetaテーブルはNo.230対応で削除済みのため、モックオブジェクトのみ返す
  const name = meta?.name ?? 'テストスポット';
  const latitude = meta?.latitude ?? 35.0;
  const longitude = meta?.longitude ?? 135.0;
  const categories = meta?.categories ?? ['park'];
  return {
    id: spotId,
    meta: {
      id: meta?.id ?? `${spotId}_meta`,
      spotId,
      name,
      latitude,
      longitude,
      image: meta?.image ?? null,
      rating: meta?.rating ?? null,
      categories,
      prefecture: meta?.prefecture ?? null,
      address: meta?.address ?? null,
      catchphrase: meta?.catchphrase ?? null,
      description: meta?.description ?? null,
      openingHours: meta?.openingHours ?? null,
      url: meta?.url ?? null,
    },
  };
}

/**
 * Wishlistエントリを作成
 */
export async function createWishlistEntry(params: {
  spotId: string;
  userId: string;
  memo?: string | null;
  priority?: number;
  visited?: number;
  visitedAt?: Date | null;
}) {
  const { spotId, userId, memo = null, priority = 1, visited = 0, visitedAt = null } = params;
  const [created] = await db
    .insert(wishlist)
    .values({
      spotId,
      userId,
      memo,
      priority,
      visited,
      visitedAt: visitedAt?.toISOString() ?? null,
    })
    .returning();
  return created;
}

/**
 * Tripを作成
 */
export async function createTrip(data: { title: string; userId: string; startDate?: string; endDate?: string }) {
  const [created] = await db
    .insert(trip)
    .values({
      title: data.title,
      userId: data.userId,
      startDate: data.startDate ?? '2024-01-01',
      endDate: data.endDate ?? '2024-01-02',
    })
    .returning();
  return created;
}

/**
 * Planを作成
 */
export async function createPlan(data: { tripId: number; date: string }) {
  const [created] = await db
    .insert(plan)
    .values({
      tripId: data.tripId,
      date: data.date,
    })
    .returning();
  return created;
}

/**
 * PlanSpotを作成
 */
export async function createPlanSpot(data: {
  planId: number;
  spotId: string;
  order?: number;
  stayStart?: string;
  stayEnd?: string;
  stayDuration?: number;
  memo?: string | null;
}) {
  const [created] = await db
    .insert(planSpot)
    .values({
      planId: data.planId,
      spotId: data.spotId,
      order: data.order ?? 0,
      stayStart: data.stayStart ?? '09:00',
      stayEnd: data.stayEnd ?? '10:00',
      stayDuration: data.stayDuration ?? 60,
      memo: data.memo ?? null,
    })
    .returning();
  return created;
}

/**
 * Notificationを作成
 */
export async function createNotification(data: {
  title: string;
  content: string;
  type?: 'SYSTEM' | 'INFO';
  publishedAt?: Date | string;
}) {
  let publishedAtStr: string;
  if (data.publishedAt instanceof Date) {
    publishedAtStr = data.publishedAt.toISOString();
  } else if (typeof data.publishedAt === 'string') {
    publishedAtStr = data.publishedAt;
  } else {
    publishedAtStr = new Date().toISOString();
  }
  const [created] = await db
    .insert(notification)
    .values({
      title: data.title,
      content: data.content,
      type: data.type ?? 'INFO',
      publishedAt: publishedAtStr,
    })
    .returning();
  return created;
}

/**
 * UserNotificationを作成
 */
export async function createUserNotification(data: { userId: string; notificationId: number; isRead?: boolean }) {
  const [created] = await db
    .insert(userNotification)
    .values({
      userId: data.userId,
      notificationId: data.notificationId,
      isRead: data.isRead ?? false,
      readAt: data.isRead ? new Date().toISOString() : null,
    })
    .returning();
  return created;
}

/**
 * 全Notificationを削除
 */
export async function deleteAllNotifications() {
  await db.delete(userNotification);
  await db.delete(notification);
}

/**
 * 全Wishlistを削除
 */
export async function deleteAllWishlists() {
  await db.delete(wishlist);
}

/**
 * 全Tripを削除
 */
export async function deleteAllTrips() {
  await db.delete(transport);
  await db.delete(planSpot);
  await db.delete(tripInfo);
  await db.delete(plan);
  await db.delete(trip);
}

// ========================================
// カウント・検索・削除などのDB操作
// ========================================

/**
 * Spotのカウント（No.230対応: Spotテーブル削除済みのため常に0を返す）
 */
export async function countSpots(): Promise<number> {
  return 0;
}

/**
 * 特定ユーザーのWishlist削除
 */
export async function deleteWishlistByUser(userId: string) {
  await db.delete(wishlist).where(eq(wishlist.userId, userId));
}

/**
 * 特定ユーザーのTrip削除（関連テーブル含む）
 */
export async function deleteTripsByUser(userId: string) {
  const trips = await db.select({ id: trip.id }).from(trip).where(eq(trip.userId, userId));
  const tripIds = trips.map((t) => t.id);

  if (tripIds.length > 0) {
    const plans = await db.select({ id: plan.id }).from(plan).where(inArray(plan.tripId, tripIds));
    const planIds = plans.map((p) => p.id);

    if (planIds.length > 0) {
      await db.delete(transport).where(inArray(transport.planId, planIds));
      await db.delete(planSpot).where(inArray(planSpot.planId, planIds));
    }
    await db.delete(tripInfo).where(inArray(tripInfo.tripId, tripIds));
    await db.delete(plan).where(inArray(plan.tripId, tripIds));
    await db.delete(trip).where(eq(trip.userId, userId));
  }
}

/**
 * Notificationを取得（IDで検索）
 */
export async function findNotificationById(id: number) {
  const [found] = await db.select().from(notification).where(eq(notification.id, id)).limit(1);
  return found ?? null;
}

/**
 * UserNotificationを取得（条件検索）
 */
export async function findUserNotification(userId: string, notificationId: number) {
  const [found] = await db
    .select()
    .from(userNotification)
    .where(and(eq(userNotification.userId, userId), eq(userNotification.notificationId, notificationId)))
    .limit(1);
  return found ?? null;
}

/**
 * UserNotificationのカウント（条件付き）
 */
export async function countUserNotifications(params: { userId?: string; isRead?: boolean }): Promise<number> {
  let query = db.select().from(userNotification).$dynamic();
  const conditions = [];
  if (params.userId !== undefined) {
    conditions.push(eq(userNotification.userId, params.userId));
  }
  if (params.isRead !== undefined) {
    conditions.push(eq(userNotification.isRead, params.isRead));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  const result = await query;
  return result.length;
}

/**
 * Userをupsert（存在すれば更新、なければ作成）
 */
export async function upsertUser(data: {
  id: string;
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'USER' | 'GUEST';
  lastLoginAt?: Date | string;
  image?: string;
}) {
  const existing = await db.select().from(user).where(eq(user.id, data.id)).limit(1);

  const lastLoginAtStr = data.lastLoginAt instanceof Date ? data.lastLoginAt.toISOString() : (data.lastLoginAt ?? null);

  if (existing.length > 0) {
    const [updated] = await db
      .update(user)
      .set({
        name: data.name ?? existing[0].name,
        email: data.email ?? existing[0].email,
        role: data.role ?? existing[0].role,
        lastLoginAt: lastLoginAtStr ?? existing[0].lastLoginAt,
        image: data.image ?? existing[0].image,
      })
      .where(eq(user.id, data.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(user)
    .values({
      id: data.id,
      name: data.name ?? null,
      email: data.email ?? null,
      role: data.role ?? 'USER',
      lastLoginAt: lastLoginAtStr,
      image: data.image ?? null,
    })
    .returning();
  return created;
}

/**
 * 特定ユーザーを削除
 */
export async function deleteUser(userId: string) {
  await db.delete(user).where(eq(user.id, userId));
}

/**
 * 複数ユーザーを削除（ID配列）
 */
export async function deleteUsersByIds(userIds: string[]) {
  if (userIds.length > 0) {
    await db.delete(user).where(inArray(user.id, userIds));
  }
}

/**
 * LIKEパターンでユーザー削除
 */
export async function deleteUsersByIdPattern(pattern: string) {
  await db.delete(user).where(like(user.id, `${pattern}%`));
}

/**
 * Userを検索（ID）
 */
export async function findUserById(userId: string) {
  const [found] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  return found ?? null;
}

/**
 * Spotを検索（ID）
 * No.230対応: SpotテーブルおよびSpotMetaテーブルは削除済みのため常にnullを返す
 */
export async function findSpotById(_spotId: string) {
  return null;
}

// ========================================
// UserLocation（お気に入り地点）のヘルパー
// ========================================

/**
 * UserLocationを作成
 */
export async function createUserLocation(data: {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  label?: string | null;
  usageCount?: number;
  isDefault?: boolean;
}) {
  const [created] = await db
    .insert(userLocation)
    .values({
      userId: data.userId,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      label: data.label ?? null,
      usageCount: data.usageCount ?? 0,
      isDefault: data.isDefault ?? false,
    })
    .returning();
  return created;
}

/**
 * UserLocationを取得（IDで検索）
 */
export async function findUserLocationById(id: number) {
  const [found] = await db.select().from(userLocation).where(eq(userLocation.id, id)).limit(1);
  return found ?? null;
}

/**
 * UserLocationを取得（ユーザーIDで検索）
 */
export async function findUserLocationsByUserId(userId: string) {
  return await db.select().from(userLocation).where(eq(userLocation.userId, userId));
}

/**
 * 特定ユーザーのUserLocation削除
 */
export async function deleteUserLocationByUser(userId: string) {
  await db.delete(userLocation).where(eq(userLocation.userId, userId));
}

/**
 * 特定ユーザーのUserLocationカウント
 */
export async function countUserLocations(userId: string): Promise<number> {
  const result = await db.select().from(userLocation).where(eq(userLocation.userId, userId));
  return result.length;
}

// ========================================
// PlanLocation（出発地・目的地履歴）のヘルパー
// ========================================

/**
 * PlanLocationを作成
 */
export async function createPlanLocation(data: {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  time?: string;
  locationType: 'DEPARTURE' | 'DESTINATION' | 'SPOT';
  usageCount?: number;
  planId: number;
}) {
  const [created] = await db
    .insert(planLocation)
    .values({
      userId: data.userId,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      time: data.time ?? (data.locationType === 'DESTINATION' ? '18:00' : '09:00'),
      locationType: data.locationType,
      planId: data.planId,
    })
    .returning();
  return created;
}

/**
 * PlanLocationを取得（IDで検索）
 */
export async function findPlanLocationById(id: number) {
  const [found] = await db.select().from(planLocation).where(eq(planLocation.id, id)).limit(1);
  return found ?? null;
}

/**
 * PlanLocationを取得（ユーザーIDで検索）
 */
export async function findPlanLocationsByUserId(userId: string) {
  return await db.select().from(planLocation).where(eq(planLocation.userId, userId));
}

/**
 * 特定ユーザーのPlanLocation削除
 */
export async function deletePlanLocationByUser(userId: string) {
  await db.delete(planLocation).where(eq(planLocation.userId, userId));
}

/**
 * 特定ユーザーのPlanLocationカウント
 */
export async function countPlanLocations(userId: string): Promise<number> {
  const result = await db.select().from(planLocation).where(eq(planLocation.userId, userId));
  return result.length;
}

// 後方互換性のためのエイリアス（段階的に削除）
export const connectPrisma = connectDb;
export const disconnectPrisma = disconnectDb;
export const clearTestData = clearAllTestData;
export const clearTestDataForUser = clearUserTestData;

// デフォルトエクスポート
export default {
  db,
  connectDb,
  disconnectDb,
  clearAllTestData,
  clearUserTestData,
  createTestUser,
  createUserWithDetails,
  deleteUsersExcept,
  createSpotWithMeta,
  createWishlistEntry,
  createTrip,
  createPlan,
  createPlanSpot,
  createNotification,
  createUserNotification,
  deleteAllNotifications,
  deleteAllWishlists,
  deleteAllTrips,
  // UserLocation関連
  createUserLocation,
  findUserLocationById,
  findUserLocationsByUserId,
  deleteUserLocationByUser,
  countUserLocations,
  // PlanLocation関連
  createPlanLocation,
  findPlanLocationById,
  findPlanLocationsByUserId,
  deletePlanLocationByUser,
  countPlanLocations,
  // 後方互換性
  connectPrisma,
  disconnectPrisma,
  clearTestData,
  clearTestDataForUser,
};
