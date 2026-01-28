import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '@/generated/prisma/client';

// テスト用のPostgreSQL接続プールを作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Pg Adapterを作成
const adapter = new PrismaPg(pool);

// PrismaClientの初期化（Prisma 7.x以降はアダプターが必要）
const prismaClient = new PrismaClient({
  adapter,
});

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
  await prismaClient.$disconnect();
}

/**
 * テスト用データを安全に全削除するユーティリティ。
 * 外部キー制約を考慮した順序で各モデルの deleteMany() を実行します。
 *
 * 削除順:
 *  - 依存先が多い子テーブルを先に削除する（例: PlanSpot, TripInfo, Plan, Trip, Wishlist, NearestStation, SpotMeta, Spot, User）
 *  - もしスキーマに新しいモデルを追加した場合は、依存関係に注意してここに追加してください。
 *
 * エラーが発生しても処理を続行し、最後にまとめてエラーを throw しません（ログを残す）。
 */
export async function clearTestData(): Promise<void> {
  // 削除順を列挙（schema.prisma の依存関係に基づく）
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
    'user' as any,
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
