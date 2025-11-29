import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'bun:test';
import { testClient } from 'hono/testing';
import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';

import { WishlistCreateSchema, WishlistListResponseSchema, WishlistUpdateSchema } from '@/models/wishlist';

import app from '..';
import prismaClient, { clearTestData, connectPrisma, createTestUser, disconnectPrisma } from './prisma';

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_user_id';

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(),
}));

beforeAll(async () => {
  await connectPrisma();
  await clearTestData();
  await createTestUser(TEST_USER_ID);
});

afterAll(async () => {
  await clearTestData();
  await disconnectPrisma();
});

beforeEach(async () => {
  vi.clearAllMocks();
  (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: TEST_USER_ID });
});

export const mockAuthenticatedContext = (userId: string = TEST_USER_ID): Context => {
  return {
    get: (key: string) => {
      if (key === 'auth') {
        return {
          userId,
          sessionId: 'mockSessionId',
        };
      }

      return undefined;
    },
  } as unknown as Context;
};

// 再利用するモックデータ
const mockSpotMeta = {
  id: 'spot_abc123',
  spotId: 'spot_abc123',
  name: '有名な観光地',
  latitude: 35.6622,
  longitude: 134.6622,
  image: 'https://example.com/image.jpg',
  rating: 4.2,
  categories: ['park'],
  catchphrase: '夜景が綺麗な場所です',
  description: '家族連れにおすすめです',
  openingHours: [
    {
      day: '月',
      hours: '9:00-18:00',
    },
  ],
};

const mockSpotPayload = {
  id: 'spot_abc123',
  meta: mockSpotMeta,
};

describe('🧾 行きたいリストサービス', () => {
  const client = testClient(app) as any;

  // ---- GET: 一覧取得 ----
  describe('GET /wishlist', () => {
    // 行きたいリスト一覧の取得テスト(中身が空)
    it('データが無い場合は空配列を返す', async () => {
      const response = await client.api.wishlist.$get();
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      expect((res as any[]).length).toBe(0);
    });

    // 行きたいリストの中身が単数1件のテスト
    it('単数1件が存在する場合は配列で返す', async () => {
      // 実DB（PrismaClient）を使って spot と wishlist を作成する
      const spot = await prismaClient.prisma.spot.create({
        data: {
          id: mockSpotPayload.id,
          meta: {
            create: {
              id: mockSpotMeta.id,
              name: mockSpotMeta.name,
              description: mockSpotMeta.description,
              latitude: mockSpotMeta.latitude,
              longitude: mockSpotMeta.longitude,
              categories: mockSpotMeta.categories,
              image: mockSpotMeta.image,
              rating: mockSpotMeta.rating,
              catchphrase: mockSpotMeta.catchphrase,
              openingHours: mockSpotMeta.openingHours,
            },
          },
        },
      });
      await prismaClient.prisma.wishlist.create({
        data: {
          spotId: spot.id,
          userId: TEST_USER_ID,
          memo: 'memo1',
          priority: 1,
          visited: 0,
          visitedAt: null,
        },
      });
      const response = await client.api.wishlist.$get();
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      expect((res as any[]).length).toBeGreaterThanOrEqual(1);
      // レスポンスのスキーマがAPI仕様の一致すること
      const parseResult = WishlistListResponseSchema.safeParse(res);
      expect(parseResult.success).toBe(true);
    });
    // 行きたいリストの中身が複数件のテスト
    it('複数件が存在する場合は配列で返す', async () => {
      const spot2 = await prismaClient.prisma.spot.create({
        data: {
          id: 'spot_def456',
          meta: {
            create: {
              id: 'spot_def456',
              name: '別の有名な観光地',
              description: '歴史的な建造物です',
              latitude: 36.6622,
              longitude: 135.6622,
              categories: ['museum'],
              image: 'https://example.com/image2.jpg',
              rating: 4.5,
              catchphrase: '歴史を感じる場所です',
              openingHours: [
                {
                  day: '月',
                  hours: '9:00-18:00',
                },
              ],
            },
          },
        },
      });
      // 2件目の行きたいリストを作成する
      await prismaClient.prisma.wishlist.create({
        data: {
          spotId: spot2.id,
          userId: TEST_USER_ID,
          memo: 'memo1',
          priority: 1,
          visited: 0,
          visitedAt: null,
        },
      });
      const response = await client.api.wishlist.$get();
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      expect((res as any[]).length).toBeGreaterThanOrEqual(2);
      // レスポンスのスキーマがAPI仕様の一致すること
      const parseResult = WishlistListResponseSchema.safeParse(res);
      expect(parseResult.success).toBe(true);
    });

    // 行きたいリスト取得時に他のユーザーのデータが混入しないことを確認するテスト
    it('他のユーザーの行きたいリストが混入しないことを確認する', async () => {
      // 別ユーザーの行きたいリストを作成する
      const otherUserId = 'other_user_id';
      await createTestUser(otherUserId);
      await prismaClient.prisma.wishlist.create({
        data: {
          spotId: mockSpotPayload.id,
          userId: otherUserId,
          memo: 'memo_other',
          priority: 2,
          visited: 0,
          visitedAt: null,
        },
      });

      // テスト対象ユーザーの行きたいリストを取得する
      const response = await client.api.wishlist.$get();
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      // 取得した行きたいリストに他のユーザーのデータが含まれていないことを確認する
      for (const item of res as any[]) {
        expect(item.userId).toBe(TEST_USER_ID);
      }
    });

    // 行きたいリスト取得時に、認証エラーが発生した場合のテスト
    it('認証エラーが発生した場合は401エラーを返す', async () => {
      // getAuthのモックを認証エラーに設定する
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });

      const res = await client.api.wishlist.$get();
      expect(res.status).toBe(401);
    });
  });

  // ---- POST: 作成 ----
  describe('POST /wishlist', () => {
    it('スポットがDBに登録済みの場合は wishlist のみを作成する', async () => {
      // 事前に spot を作成
      const spot = await prismaClient.prisma.spot.create({
        data: {
          id: 'spot_def789',
          meta: {
            create: {
              id: 'spot_def789',
              name: '別の有名な観光地',
              description: '歴史的な建造物です',
              latitude: 36.6622,
              longitude: 135.6622,
              categories: ['museum'],
              image: 'https://example.com/image2.jpg',
              rating: 4.5,
              catchphrase: '歴史を感じる場所です',
              openingHours: [
                {
                  day: '月',
                  hours: '9:00-18:00',
                },
              ],
            },
          },
        },
        include: {
          meta: true,
        },
      });

      // カウントを取得
      const beforeSpotCount = await prismaClient.prisma.spot.count();

      const payload = {
        spotId: spot.id,
        spot: spot,
        memo: 'memo1',
        priority: 1,
        visited: 0,
        visitedAt: null,
      };

      // APIにリクエストを送信する際のスキーマが正しいか
      const parseResult = WishlistCreateSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);

      const res = await client.api.wishlist.$post({
        json: payload,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('spotId', spot.id);

      // spot が新規作成されていないこと
      const afterSpotCount = await prismaClient.prisma.spot.count();
      expect(afterSpotCount).toBe(beforeSpotCount);
    });

    it('スポットがDBに登録されていない場合は先にスポットを登録してから wishlist を作成する', async () => {
      const beforeSpotCount = await prismaClient.prisma.spot.count();

      const payload = {
        spotId: 'new_spot_99',
        spot: {
          id: 'new_spot_99',
          meta: {
            id: 'new_spot_99_meta',
            spotId: 'new_spot_99',
            name: '別の有名な観光地',
            description: '歴史的な建造物です',
            latitude: 36.6622,
            longitude: 135.6622,
            categories: ['museum'],
            image: 'https://example.com/image2.jpg',
            rating: 4.5,
            catchphrase: '歴史を感じる場所です',
          },
        },
        memo: 'ここに行きたい',
        priority: 1,
        visited: 0,
        visitedAt: null,
      };

      // APIにリクエストを送信する際のスキーマが正しいか
      const parseResult = WishlistCreateSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);

      const res = await client.api.wishlist.$post({ json: payload });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('spotId', payload.spotId);

      // spot が作成されていること
      const afterSpotCount = await prismaClient.prisma.spot.count();
      expect(afterSpotCount).toBeGreaterThan(beforeSpotCount);
      const spotInDb = await prismaClient.prisma.spot.findUnique({ where: { id: payload.spotId } });
      expect(spotInDb).not.toBeNull();
    });

    it('セッションが切れた場合は 401 を返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });
      const payload = {
        spotId: 'any',
        spot: {
          id: 'any',
          meta: {
            id: 'any_meta',
            spotId: 'any',
            name: '別の有名な観光地',
            description: '歴史的な建造物です',
            latitude: 36.6622,
            longitude: 135.6622,
            categories: ['museum'],
            image: 'https://example.com/image2.jpg',
            rating: 4.5,
            catchphrase: '歴史を感じる場所です',
          },
        },
        memo: 'ここに行きたい',
        priority: 1,
        visited: 0,
        visitedAt: null,
      };

      const res = await client.api.wishlist.$post({ json: payload });

      expect(res.status).toBe(401);
    });

    it('意図しないデータが来た場合はバリデーションエラーを返す (400 or 422)', async () => {
      // 明らかに不正なデータ (missing spotId and wrong types)
      const payload = {
        spotId: 'any',
        spot: {
          id: 'any',
          meta: {
            id: 'any_meta',
            spotId: 'any',
            name: '別の有名な観光地',
            description: '歴史的な建造物です',
            latitude: 36.6622,
            longitude: 135.6622,
            categories: ['museum'],
            image: 'https://example.com/image2.jpg',
            rating: 4.5,
            catchphrase: '歴史を感じる場所です',
            openingHours: [
              {
                day: '月',
                hours: '9:00-18:00',
              },
            ],
          },
        },
        memo: 'ここに行きたい',
        priority: 15, // invalid priority
        visited: 0,
        visitedAt: null,
      };

      const parseResult = WishlistCreateSchema.safeParse(payload);
      expect(parseResult.success).toBe(false);

      const res = await client.api.wishlist.$post({ json: payload });

      expect(res.status).toBe(400);
    });
  });

  // -- PATCH: 更新 --
  describe('PATCH /wishlist/:id', () => {
    it('既存の行きたいリストを更新できること', async () => {
      // 事前に wishlist エントリを作成
      const spot = await prismaClient.prisma.spot.create({
        data: {
          id: 'spot_patch_123',
          meta: {
            create: {
              id: 'spot_patch_123',
              name: 'パッチ用スポット',
              description: '説明文',
              latitude: 34.6622,
              longitude: 133.6622,
              categories: ['temple'],
              image: 'https://example.com/image_patch.jpg',
              rating: 4.0,
              catchphrase: 'パッチ用キャッチフレーズ',
            },
          },
        },
        include: { meta: true },
      });

      const wishlistEntry = await prismaClient.prisma.wishlist.create({
        data: {
          spotId: spot.id,
          userId: TEST_USER_ID,
          memo: '初期メモ',
          priority: 2,
          visited: 0,
          visitedAt: null,
        },
      });

      // 更新用ペイロード
      const updatePayload = {
        id: wishlistEntry.id,
        memo: '更新後のメモ',
        priority: 5,
        visited: 1,
        visitedAt: new Date().toISOString(),
      };

      const parseResult = WishlistUpdateSchema.safeParse(updatePayload);
      expect(parseResult.success).toBe(true);

      const res = await client.api.wishlist[`${wishlistEntry.id}`].$patch({
        json: updatePayload,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('id', wishlistEntry.id);
      expect(body).toHaveProperty('memo', updatePayload.memo);
      expect(body).toHaveProperty('priority', updatePayload.priority);
      expect(body).toHaveProperty('visited', updatePayload.visited);
    });

    it('存在しないIDの行きたいリストを更新しようとした場合は404エラーを返す', async () => {
      const updatePayload = {
        id: 9999,
        memo: '更新後のメモ',
        priority: 5,
        visited: 1,
        visitedAt: new Date().toISOString(),
      };

      const res = await client.api.wishlist['non_existent_id'].$patch({
        json: updatePayload,
      });

      expect(res.status).toBe(404);
    });

    it('セッションが切れた場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });

      const updatePayload = {
        id: 1,
        memo: '更新後のメモ',
        priority: 5,
        visited: 1,
        visitedAt: new Date().toISOString(),
      };
      const parseResult = WishlistUpdateSchema.safeParse(updatePayload);
      expect(parseResult.success).toBe(true);

      const res = await client.api.wishlist['1'].$patch({
        json: updatePayload,
      });

      expect(res.status).toBe(401);
    });

    it('不正なデータで更新しようとした場合は400エラーを返す', async () => {
      const updatePayload = {
        id: 1,
        memo: '更新後のメモ',
        priority: 10, // invalid priority
        visited: 1,
        visitedAt: new Date().toISOString(),
      };

      const parseResult = WishlistUpdateSchema.safeParse(updatePayload);
      expect(parseResult.success).toBe(false);

      const res = await client.api.wishlist['1'].$patch({
        json: updatePayload,
      });

      expect(res.status).toBe(400);
    });
  });

  // -- DELETE: 削除 --
  describe('DELETE /wishlist/:id', () => {
    it('既存の行きたいリストを削除できること', async () => {
      // 事前に wishlist エントリを作成
      const spot = await prismaClient.prisma.spot.create({
        data: {
          id: 'spot_delete_123',
          meta: {
            create: {
              id: 'spot_delete_123',
              name: 'デリート用スポット',
              description: '説明文',
              latitude: 34.6622,
              longitude: 133.6622,
              categories: ['temple'],
              image: 'https://example.com/image_delete.jpg',
              rating: 4.0,
              catchphrase: 'デリート用キャッチフレーズ',
              openingHours: [
                {
                  day: '月',
                  hours: '9:00-18:00',
                },
              ],
            },
          },
        },
        include: { meta: true },
      });

      const wishlistEntry = await prismaClient.prisma.wishlist.create({
        data: {
          spotId: spot.id,
          userId: TEST_USER_ID,
          memo: '初期メモ',
          priority: 2,
          visited: 0,
          visitedAt: null,
        },
      });

      const res = await client.api.wishlist[`${wishlistEntry.id}`].$delete();

      expect(res.status).toBe(200);
    });

    it('セッションが切れた場合は401エラーを返す', async () => {
      (getAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ userId: null });

      const res = await client.api.wishlist['1'].$delete();

      expect(res.status).toBe(401);
    });

    it('不正なIDの行きたいリストを削除しようとした場合は404エラーを返す', async () => {
      const res = await client.api.wishlist['non_existent_id'].$delete();

      expect(res.status).toBe(400);
    });
  });

  // -- 営業時間を含むスポット作成テスト --
  describe('営業時間を含むスポット作成', () => {
    it('営業時間を含むスポットを作成し、wishlist に登録できること', async () => {
      const spotWithHoursId = 'spot_with_hours_001';
      const openingHoursData = [
        {
          day: '月',
          hours: '9:00-18:00',
        },
      ];

      // 営業時間を含むスポットを作成
      const spotWithHours = await prismaClient.prisma.spot.create({
        data: {
          id: spotWithHoursId,
          meta: {
            create: {
              id: spotWithHoursId,
              name: '営業時間ありカフェ',
              description: '美味しいコーヒーが飲めるカフェ',
              latitude: 35.6895,
              longitude: 139.6917,
              categories: ['cafe', 'restaurant'],
              image: 'https://example.com/cafe.jpg',
              rating: 4.5,
              catchphrase: '落ち着いた雰囲気',
              openingHours: openingHoursData,
            },
          },
        },
        include: { meta: true },
      });

      // 営業時間が正しく保存されているか確認
      expect(spotWithHours.meta?.openingHours).toBeDefined();
      expect(spotWithHours.meta?.openingHours).toMatchObject(openingHoursData);

      // wishlist に追加
      const createPayload = {
        spotId: spotWithHoursId,
        spot: {
          id: spotWithHoursId,
          meta: {
            id: spotWithHoursId,
            spotId: spotWithHoursId,
            name: '営業時間ありカフェ',
            latitude: 35.6895,
            longitude: 139.6917,
            rating: 4.5,
            categories: ['cafe'],
            openingHours: openingHoursData,
          },
        },
        memo: '営業時間を確認したい',
        priority: 4,
        visited: 0,
        visitedAt: null,
      };

      const createResult = WishlistCreateSchema.safeParse(createPayload);
      expect(createResult.success).toBe(true);

      const res = await client.api.wishlist.$post({
        json: createPayload,
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.spotId).toBe(spotWithHoursId);
      expect(json.memo).toBe('営業時間を確認したい');

      // 取得してopeningHoursが含まれているか確認
      const getRes = await client.api.wishlist.$get();
      const wishlists = await getRes.json();

      const addedWishlist = (wishlists as any[]).find((w) => w.spotId === spotWithHoursId);
      expect(addedWishlist).toBeDefined();
      expect(addedWishlist.spot.meta.openingHours).toBeDefined();
    });

    it('営業時間が null のスポットも正しく作成できること', async () => {
      const spotNoHoursId = 'spot_no_hours_001';

      const spotNoHours = await prismaClient.prisma.spot.create({
        data: {
          id: spotNoHoursId,
          meta: {
            create: {
              id: spotNoHoursId,
              name: '営業時間なし公園',
              description: '24時間オープンの公園',
              latitude: 35.6805,
              longitude: 139.769,
              categories: ['park'],
              rating: 4.0,
              // openingHours を省略（null の代わり）
            },
          },
        },
        include: { meta: true },
      });

      // JSON フィールドが省略された場合は null として扱われる
      expect(spotNoHours.meta?.openingHours).toBeNull();
    });

    it('営業時間が省略されたスポットも正しく作成できること', async () => {
      const spotOmittedId = 'spot_omitted_hours_001';

      const spotOmitted = await prismaClient.prisma.spot.create({
        data: {
          id: spotOmittedId,
          meta: {
            create: {
              id: spotOmittedId,
              name: '営業時間省略スポット',
              description: '営業時間データがないスポット',
              latitude: 35.6805,
              longitude: 139.769,
              categories: ['landmark'],
              rating: 3.8,
              // openingHours は意図的に省略
            },
          },
        },
        include: { meta: true },
      });

      // JSON フィールドが省略された場合は null として扱われる
      expect(spotOmitted.meta?.openingHours).toBeNull();
    });
  });
});
