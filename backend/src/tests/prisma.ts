import { prisma } from '@/lib/client';
import { PrismaClient } from '@/generated/prisma/client';

// テスト用のPrismaClientをlib/client.tsから再利用
const prismaClient = prisma;

/**
 * Prisma に接続する
 * テストランナー側で beforeAll で呼び出してください。
 */
export async function connectPrisma(): Promise<void> {
  await prismaClient.$connect();
}

/**
 * Prisma の接続を解除する
 * テストランナー側で afterAll で呼び出してください。
 */
export async function disconnectPrisma(): Promise<void> {
  // グローバルインスタンスなので、ここでは切断しない
  // 最後のテストファイルが終了した後に自動的にクリーンアップされる
}

/**
 * テスト用データを安全に全削除するユーティリティ。
 * 外部キー制約を考慮した順序で各モデルの deleteMany() を実行します。
 *
 * 注意: この関数は全データを削除するため、並行実行時に他のテストファイルのデータも削除してしまいます。
 * 並行実行時は clearTestDataForUser() を使用してください。
 *
 * 削除順:
 *  - 依存先が多い子テーブルを先に削除する（例: PlanSpot, TripInfo, Plan, Trip, Wishlist, NearestStation, SpotMeta, Spot）
 *  - もしスキーマに新しいモデルを追加した場合は、依存関係に注意してここに追加してください。
 *
 * エラーが発生しても処理を続行し、最後にまとめてエラーを throw しません（ログを残す）。
 */
export async function clearTestData(): Promise<void> {
  // 削除順を列挙（schema.prisma の依存関係に基づく）
  // ユーザーは削除しない（複数のテストファイル間で共有されるため）
  const order: Array<keyof typeof prismaClient> = [
    // 中間テーブル・関連テーブル
    'planSpot' as any,
    'tripInfo' as any,
    'plan' as any,
    'trip' as any,
    'wishlist' as any,
    'nearestStation' as any,
    'spotMeta' as any,
    'spot' as any,
    // お知らせ関連（UserNotification を先に削除）
    'userNotification' as any,
    'notification' as any,
    // 'user' は削除しない
  ];

  for (const modelKey of order) {
    try {
      // @ts-expect-error dynamic access
      if (typeof prismaClient[modelKey]?.deleteMany === 'function') {
        // @ts-expect-error dynamic access
        await prismaClient[modelKey].deleteMany();
      }
    } catch (err) {
      // 削除でエラーが出ても続行する。テストログに残すことでデバッグしやすくする。

      console.warn(`clearTestData: failed to delete ${String(modelKey)}:`, (err as Error).message);
    }
  }
}

/**
 * 特定のユーザーに関連するテストデータを削除するユーティリティ。
 * 並行実行時に他のテストファイルのデータを消さないようにするために使用します。
 *
 * @param userId 削除対象のユーザーID
 * @param deleteSpots Spotも削除するかどうか（デフォルト: false）。文字列の場合はプレフィックスとして扱い、そのプレフィックスで始まるSpotを削除します。
 */
export async function clearTestDataForUser(userId: string, deleteSpots: boolean | string = false): Promise<void> {
  try {
    // Trip に紐づく Plan と PlanSpot を削除
    const trips = await prismaClient.trip.findMany({
      where: { userId },
      select: { id: true },
    });
    const tripIds = trips.map((t) => t.id);

    // Wishlistに紐づくSpotのIDを取得（後で削除するため）
    let wishlistSpotIds: string[] = [];
    if (deleteSpots) {
      const wishlists = await prismaClient.wishlist.findMany({
        where: { userId },
        select: { spotId: true },
      });
      wishlistSpotIds = wishlists.map((w) => w.spotId);
    }

    // PlanSpotに紐づくSpotのIDを取得
    let planSpotIds: string[] = [];
    if (deleteSpots && tripIds.length > 0) {
      const plans = await prismaClient.plan.findMany({
        where: { tripId: { in: tripIds } },
        select: { id: true },
      });
      const planIds = plans.map((p) => p.id);

      if (planIds.length > 0) {
        const planSpots = await prismaClient.planSpot.findMany({
          where: { planId: { in: planIds } },
          select: { spotId: true },
        });
        planSpotIds = planSpots.map((ps) => ps.spotId);

        await prismaClient.planSpot.deleteMany({
          where: { planId: { in: planIds } },
        });
      }

      await prismaClient.tripInfo.deleteMany({
        where: { tripId: { in: tripIds } },
      });

      await prismaClient.plan.deleteMany({
        where: { tripId: { in: tripIds } },
      });

      await prismaClient.trip.deleteMany({
        where: { userId },
      });
    } else if (tripIds.length > 0) {
      const plans = await prismaClient.plan.findMany({
        where: { tripId: { in: tripIds } },
        select: { id: true },
      });
      const planIds = plans.map((p) => p.id);

      if (planIds.length > 0) {
        await prismaClient.planSpot.deleteMany({
          where: { planId: { in: planIds } },
        });
      }

      await prismaClient.tripInfo.deleteMany({
        where: { tripId: { in: tripIds } },
      });

      await prismaClient.plan.deleteMany({
        where: { tripId: { in: tripIds } },
      });

      await prismaClient.trip.deleteMany({
        where: { userId },
      });
    }

    // Wishlist を削除
    await prismaClient.wishlist.deleteMany({
      where: { userId },
    });

    // UserNotification を削除
    await prismaClient.userNotification.deleteMany({
      where: { userId },
    });

    // Spotを削除（リクエストされた場合）
    if (deleteSpots) {
      // プレフィックスが指定された場合は、そのプレフィックスで始まるSpotを削除
      if (typeof deleteSpots === 'string') {
        // プレフィックスで始まるSpotを削除
        await prismaClient.spotMeta.deleteMany({
          where: { spotId: { startsWith: deleteSpots } },
        });
        await prismaClient.nearestStation.deleteMany({
          where: { spotId: { startsWith: deleteSpots } },
        });
        await prismaClient.spot.deleteMany({
          where: { id: { startsWith: deleteSpots } },
        });
      } else {
        // true の場合は、Wishlist/PlanSpotに紐づくSpotを削除
        const allSpotIds = [...new Set([...wishlistSpotIds, ...planSpotIds])];
        if (allSpotIds.length > 0) {
          // SpotMetaを先に削除
          await prismaClient.spotMeta.deleteMany({
            where: { spotId: { in: allSpotIds } },
          });
          // NearestStationを削除
          await prismaClient.nearestStation.deleteMany({
            where: { spotId: { in: allSpotIds } },
          });
          // Spotを削除
          await prismaClient.spot.deleteMany({
            where: { id: { in: allSpotIds } },
          });
        }
      }
    }
  } catch (err) {
    console.warn(`clearTestDataForUser: failed to delete data for user ${userId}:`, (err as Error).message);
  }
}

/**
 * テストユーザーを作成するユーティリティ（重複時は既存レコードを返す）
 * @param userId 作成するユーザーのID
 * @returns 作成または既存の user レコード
 */
export async function createTestUser(userId: string, role: 'ADMIN' | 'USER' | 'GUEST' = 'USER') {
  try {
    // upsert を使い、既存ユーザーがいてもエラーにならないようにする
    return await prismaClient.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, role: role },
    });
  } catch (err) {
    console.warn('createTestUser: upsert failed, attempting findUnique fallback:', (err as Error).message);
    // 最後の手段で既存ユーザーを返す / または再作成を試みる
    const existing = await prismaClient.user.findUnique({ where: { id: userId } });
    if (existing) return existing;
    // 再度 create を試す（可能性低いが安全措置）
    return prismaClient.user.create({ data: { id: userId } });
  }
}

/**
 * Spot と SpotMeta を同時に作成するユーティリティ
 * - SpotMeta が必要なスキーマを満たすために meta を作成する
 *
 * @param spotId Spot の id
 * @param meta SpotMeta のフィールド（部分指定可）
 * @returns 作成した Spot レコード（meta を含む）
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
  },
) {
  const metaId = meta?.id ?? `${spotId}_meta`;
  const name = meta?.name ?? 'テストスポット';
  const latitude = meta?.latitude ?? 35.0;
  const longitude = meta?.longitude ?? 135.0;
  const categories = meta?.categories ?? ['park'];

  return prismaClient.spot.create({
    data: {
      id: spotId,
      meta: {
        create: {
          id: metaId,
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
        },
      },
    },
    include: { meta: true },
  });
}

/**
 * Wishlist エントリを作成するユーティリティ
 * @param params 作成パラメータ
 * @returns 作成した wishlist レコード
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
  return prismaClient.wishlist.create({
    data: {
      spotId,
      userId,
      memo,
      priority,
      visited,
      visitedAt,
    },
  });
}

/**
 * テスト用の DB とユーティリティを外部公開する
 */
export default {
  prisma: prismaClient,
  connectPrisma,
  disconnectPrisma,
  clearTestData,
  createTestUser,
  createSpotWithMeta,
  createWishlistEntry,
};
