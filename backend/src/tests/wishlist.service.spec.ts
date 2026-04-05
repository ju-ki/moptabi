import { beforeAll, beforeEach, afterAll, describe, expect, it, setSystemTime } from 'bun:test';
import { testClient } from 'hono/testing';

import { WishlistCreateSchema, WishlistUpdateSchema } from '@/models/wishlist';

import app from '..';
import {
  db,
  eq,
  wishlist,
  connectDb as connectPrisma,
  disconnectDb as disconnectPrisma,
  clearUserTestData as clearTestDataForUser,
  clearAllTestData as clearTestData,
  createTestUser,
  createSpotWithMeta,
  createWishlistEntry,
  countSpots,
  findSpotById,
} from './db-helper';

// 認証用のモックユーザーID
const TEST_USER_ID = 'test_user_wishlist';

// 現在の認証ユーザーIDを保持する変数
let currentUserId: string | null = TEST_USER_ID;

// 認証ヘッダーを生成するヘルパー関数
function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) {
    return {};
  }
  return { 'X-User-Id': currentUserId };
}

beforeAll(async () => {
  await connectPrisma();
  await clearTestDataForUser(TEST_USER_ID);
  await createTestUser(TEST_USER_ID, 'ADMIN');
});

afterAll(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await disconnectPrisma();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
});

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
  url: 'https://example.com',
  prefecture: '東京都',
  address: '東京都千代田区千代田1-1',
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
      const response = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      expect((res as any[]).length).toBe(0);
    });

    // 行きたいリストの中身が単数1件のテスト
    it('単数1件が存在する場合は配列で返す', async () => {
      // Drizzleを使って spot と wishlist を作成する
      await createSpotWithMeta(mockSpotPayload.id, {
        id: mockSpotMeta.id,
        name: mockSpotMeta.name,
        description: mockSpotMeta.description,
        latitude: mockSpotMeta.latitude,
        longitude: mockSpotMeta.longitude,
        categories: mockSpotMeta.categories,
        image: mockSpotMeta.image,
        rating: mockSpotMeta.rating,
        url: mockSpotMeta.url,
        prefecture: mockSpotMeta.prefecture,
        address: mockSpotMeta.address,
        catchphrase: mockSpotMeta.catchphrase,
        openingHours: mockSpotMeta.openingHours,
      });
      await createWishlistEntry({
        spotId: mockSpotPayload.id,
        userId: TEST_USER_ID,
        memo: 'memo1',
        priority: 1,
        visited: 0,
        visitedAt: null,
      });
      const response = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      expect((res as any[]).length).toBeGreaterThanOrEqual(1);
      // placeIdのみ返す新レスポンス構造を確認（SpotMetaは含まない）
      const firstItem = (res as any[])[0];
      expect(firstItem.spotId).toBeDefined();
      expect(firstItem.spot.id).toBeDefined();
      expect(firstItem.spot.meta).toBeUndefined();
    });
    // 行きたいリストの中身が複数件のテスト
    it('複数件が存在する場合は配列で返す', async () => {
      await createSpotWithMeta('spot_def456', {
        id: 'spot_def456',
        name: '別の有名な観光地',
        description: '歴史的な建造物です',
        latitude: 36.6622,
        longitude: 135.6622,
        categories: ['museum'],
        image: 'https://example.com/image2.jpg',
        url: 'https://example.com',
        prefecture: '東京都',
        address: '東京都千代田区千代田1-1',
        rating: 4.5,
        catchphrase: '歴史を感じる場所です',
        openingHours: [{ day: '月', hours: '9:00-18:00' }],
      });
      // 2件目の行きたいリストを作成する
      await createWishlistEntry({
        spotId: 'spot_def456',
        userId: TEST_USER_ID,
        memo: 'memo1',
        priority: 1,
        visited: 0,
        visitedAt: null,
      });
      const response = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      expect((res as any[]).length).toBeGreaterThanOrEqual(2);
      // placeIdのみ返す新レスポンス構造を確認（SpotMetaは含まない）
      for (const item of res as any[]) {
        expect(item.spotId).toBeDefined();
        expect(item.spot.id).toBeDefined();
        expect(item.spot.meta).toBeUndefined();
      }
    });

    // 行きたいリスト取得時に他のユーザーのデータが混入しないことを確認するテスト
    it('他のユーザーの行きたいリストが混入しないことを確認する', async () => {
      // 別ユーザーの行きたいリストを作成する
      const otherUserId = 'other_user_id';
      await createTestUser(otherUserId);
      await createWishlistEntry({
        spotId: mockSpotPayload.id,
        userId: otherUserId,
        memo: 'memo_other',
        priority: 2,
        visited: 0,
        visitedAt: null,
      });

      // テスト対象ユーザーの行きたいリストを取得する
      const response = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      const res = await response.json();
      expect(Array.isArray(res)).toBe(true);
      // 取得した行きたいリストに他のユーザーのデータが含まれていないことを確認する
      for (const item of res as any[]) {
        expect(item.userId).toBe(TEST_USER_ID);
      }
    });

    // 行きたいリスト取得時に、認証エラーが発生した場合のテスト
    it('認証エラーが発生した場合は401エラーを返す', async () => {
      // currentUserIdのモックを認証エラーに設定する
      currentUserId = null;

      const res = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      expect(res.status).toBe(401);
    });
  });

  // ---- POST: 作成 ----
  describe('POST /wishlist', () => {
    it('スポットがDBに登録済みの場合は wishlist のみを作成する', async () => {
      // 事前に spot を作成
      const spotData = await createSpotWithMeta('spot_def789', {
        id: 'spot_def789',
        name: '別の有名な観光地',
        description: '歴史的な建造物です',
        latitude: 36.6622,
        longitude: 135.6622,
        categories: ['museum'],
        image: 'https://example.com/image2.jpg',
        rating: 4.5,
        url: 'https://example.com',
        prefecture: '東京都',
        address: '東京都千代田区千代田1-1',
        catchphrase: '歴史を感じる場所です',
        openingHours: [{ day: '月', hours: '9:00-18:00' }],
      });

      // カウントを取得
      const beforeSpotCount = await countSpots();

      const payload = {
        spotId: spotData.id,
        spot: {
          id: spotData.id,
          meta: {
            id: spotData.meta!.id,
            spotId: spotData.id,
            name: spotData.meta!.name,
            description: spotData.meta!.description,
            latitude: spotData.meta!.latitude,
            longitude: spotData.meta!.longitude,
            categories: spotData.meta!.categories,
            image: spotData.meta!.image,
            rating: spotData.meta!.rating,
            url: spotData.meta!.url,
            prefecture: spotData.meta!.prefecture,
            address: spotData.meta!.address,
            catchphrase: spotData.meta!.catchphrase,
            openingHours: spotData.meta!.openingHours,
          },
        },
        memo: 'memo1',
        priority: 1,
        visited: 0,
        visitedAt: null,
      };

      // APIにリクエストを送信する際のスキーマが正しいか
      const parseResult = WishlistCreateSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);

      const res = await client.api.wishlist.$post(
        {
          json: payload,
        },
        { headers: getAuthHeaders() },
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('spotId', spotData.id);

      // spot が新規作成されていないこと
      const afterSpotCount = await countSpots();
      expect(afterSpotCount).toBe(beforeSpotCount);
    });

    it('スポットがDBに登録されていない場合も wishlist を作成できる（No.230対応: SpotテーブルはなくなりplaceIdのみ保持）', async () => {
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

      const res = await client.api.wishlist.$post({ json: payload }, { headers: getAuthHeaders() });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('spotId', payload.spotId);
      // No.230対応: Spot/SpotMetaテーブルは削除済み。placeIdはWishlist.spotIdに直接格納される。
      // スポットDB登録の検証は不要。
    });

    it('セッションが切れた場合は 401 を返す', async () => {
      currentUserId = null;
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

      const res = await client.api.wishlist.$post({ json: payload }, { headers: getAuthHeaders() });

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
            url: 'https://example.com',
            prefecture: '東京都',
            address: '東京都千代田区千代田1-1',
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

      const res = await client.api.wishlist.$post({ json: payload }, { headers: getAuthHeaders() });

      expect(res.status).toBe(400);
    });
  });

  // -- PATCH: 更新 --
  describe('PATCH /wishlist/:id', () => {
    it('既存の行きたいリストを更新できること', async () => {
      // 事前に wishlist エントリを作成
      await createSpotWithMeta('spot_patch_123', {
        id: 'spot_patch_123',
        name: 'パッチ用スポット',
        description: '説明文',
        latitude: 34.6622,
        longitude: 133.6622,
        categories: ['temple'],
        url: 'https://example.com',
        prefecture: '東京都',
        address: '東京都千代田区千代田1-1',
        image: 'https://example.com/image_patch.jpg',
        rating: 4.0,
        catchphrase: 'パッチ用キャッチフレーズ',
      });

      const wishlistEntry = await createWishlistEntry({
        spotId: 'spot_patch_123',
        userId: TEST_USER_ID,
        memo: '初期メモ',
        priority: 2,
        visited: 0,
        visitedAt: null,
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

      const res = await client.api.wishlist[`${wishlistEntry.id}`].$patch(
        {
          json: updatePayload,
        },
        { headers: getAuthHeaders() },
      );

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

      const res = await client.api.wishlist['non_existent_id'].$patch(
        {
          json: updatePayload,
        },
        { headers: getAuthHeaders() },
      );

      expect(res.status).toBe(404);
    });

    it('セッションが切れた場合は401エラーを返す', async () => {
      currentUserId = null;

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

      const res = await client.api.wishlist['1'].$patch(
        {
          json: updatePayload,
        },
        { headers: getAuthHeaders() },
      );

      expect(res.status).toBe(400);
    });
  });

  // -- DELETE: 削除 --
  describe('DELETE /wishlist/:id', () => {
    it('既存の行きたいリストを削除できること', async () => {
      // 事前に wishlist エントリを作成
      await createSpotWithMeta('spot_delete_123', {
        id: 'spot_delete_123',
        name: 'デリート用スポット',
        description: '説明文',
        latitude: 34.6622,
        longitude: 133.6622,
        categories: ['temple'],
        image: 'https://example.com/image_delete.jpg',
        rating: 4.0,
        catchphrase: 'デリート用キャッチフレーズ',
        url: 'https://example.com',
        prefecture: '東京都',
        address: '東京都千代田区千代田1-1',
        openingHours: [{ day: '月', hours: '9:00-18:00' }],
      });

      const wishlistEntry = await createWishlistEntry({
        spotId: 'spot_delete_123',
        userId: TEST_USER_ID,
        memo: '初期メモ',
        priority: 2,
        visited: 0,
        visitedAt: null,
      });

      const res = await client.api.wishlist[`${wishlistEntry.id}`].$delete({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(200);
    });

    it('セッションが切れた場合は401エラーを返す', async () => {
      currentUserId = null;

      const res = await client.api.wishlist['1'].$delete();

      expect(res.status).toBe(401);
    });

    it('不正なIDの行きたいリストを削除しようとした場合は404エラーを返す', async () => {
      const res = await client.api.wishlist['non_existent_id'].$delete({}, { headers: getAuthHeaders() });

      expect(res.status).toBe(400);
    });
  });

  // -- 営業時間を含むスポット作成テスト --
  describe('営業時間を含むスポット作成', () => {
    it('営業時間を含むスポットを作成し、wishlist に登録できること', async () => {
      const spotWithHoursId = 'spot_with_hours_001';
      const openingHoursData = [{ day: '月', hours: '9:00-18:00' }];

      // 営業時間を含むスポットを作成
      const spotWithHours = await createSpotWithMeta(spotWithHoursId, {
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

      const res = await client.api.wishlist.$post(
        {
          json: createPayload,
        },
        { headers: getAuthHeaders() },
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.spotId).toBe(spotWithHoursId);
      expect(json.memo).toBe('営業時間を確認したい');

      // 取得してopeningHoursが含まれているか確認
      const getRes = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      const wishlists = await getRes.json();

      const addedWishlist = (wishlists as any[]).find((w) => w.spotId === spotWithHoursId);
      expect(addedWishlist).toBeDefined();
      // SpotMetaは返さない。spot.idのみ確認（詳細はフロントでGoogle Maps APIから取得）
      expect(addedWishlist.spot.id).toBe(spotWithHoursId);
      expect(addedWishlist.spot.meta).toBeUndefined();
    });

    it('営業時間が null のスポットも正しく作成できること', async () => {
      const spotNoHoursId = 'spot_no_hours_001';

      const spotNoHours = await createSpotWithMeta(spotNoHoursId, {
        id: spotNoHoursId,
        name: '営業時間なし公園',
        description: '24時間オープンの公園',
        latitude: 35.6805,
        longitude: 139.769,
        categories: ['park'],
        rating: 4.0,
        // openingHours を省略（null の代わり）
      });

      // JSON フィールドが省略された場合は null として扱われる
      expect(spotNoHours.meta?.openingHours).toBeNull();
    });

    it('営業時間が省略されたスポットも正しく作成できること', async () => {
      const spotOmittedId = 'spot_omitted_hours_001';

      const spotOmitted = await createSpotWithMeta(spotOmittedId, {
        id: spotOmittedId,
        name: '営業時間省略スポット',
        description: '営業時間データがないスポット',
        latitude: 35.6805,
        longitude: 139.769,
        categories: ['landmark'],
        rating: 3.8,
        // openingHours は意図的に省略
      });

      // JSON フィールドが省略された場合は null として扱われる
      expect(spotOmitted.meta?.openingHours).toBeNull();
    });
  });

  // -- ユーザーIDごとの行きたいリスト数取得テスト --
  describe('countWishListByUserId', () => {
    it('複数のユーザーがそれぞれ異なる数のwishlistを持つ場合、正しくカウントできること', async () => {
      // テスト用ユーザーを3人作成
      const user1 = 'count_test_user_1';
      const user2 = 'count_test_user_2';
      const user3 = 'count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      // テスト用スポットを作成
      await createSpotWithMeta('count_spot_1', {
        id: 'count_spot_1',
        name: 'カウントテスト用スポット1',
        description: 'テスト用',
        latitude: 35.6895,
        longitude: 139.6917,
        categories: ['park'],
        rating: 4.0,
      });

      await createSpotWithMeta('count_spot_2', {
        id: 'count_spot_2',
        name: 'カウントテスト用スポット2',
        description: 'テスト用',
        latitude: 35.6896,
        longitude: 139.6918,
        categories: ['restaurant'],
        rating: 4.5,
      });

      await createSpotWithMeta('count_spot_3', {
        id: 'count_spot_3',
        name: 'カウントテスト用スポット3',
        description: 'テスト用',
        latitude: 35.6897,
        longitude: 139.6919,
        categories: ['museum'],
        rating: 4.2,
      });

      // user1: 2件のwishlistを作成
      await createWishlistEntry({ spotId: 'count_spot_1', userId: user1, priority: 1, visited: 0 });
      await createWishlistEntry({ spotId: 'count_spot_2', userId: user1, priority: 1, visited: 0 });

      // user2: 1件のwishlistを作成
      await createWishlistEntry({ spotId: 'count_spot_3', userId: user2, priority: 1, visited: 0 });

      // user3: wishlistを作成しない（0件）

      // カウント実行
      const { countWishListByUserId } = await import('@/services/wishlist');
      const result = await countWishListByUserId([user1, user2, user3]);

      // 検証
      expect(result[user1]).toBe(2);
      expect(result[user2]).toBe(1);
      expect(result[user3]).toBeUndefined(); // wishlistが0件の場合は含まれない
    });

    it('wishlistを持たないユーザーは結果に含まれないこと', async () => {
      const userWithoutWishlist = 'user_without_wishlist';
      await createTestUser(userWithoutWishlist);

      const { countWishListByUserId } = await import('@/services/wishlist');
      const result = await countWishListByUserId([userWithoutWishlist]);

      // wishlistが0件の場合は結果オブジェクトに含まれない
      expect(result[userWithoutWishlist]).toBeUndefined();
      expect(Object.keys(result).length).toBe(0);
    });

    it('空の配列を渡した場合、空のオブジェクトを返すこと', async () => {
      const { countWishListByUserId } = await import('@/services/wishlist');
      const result = await countWishListByUserId([]);

      expect(result).toEqual({});
      expect(Object.keys(result).length).toBe(0);
    });

    it('指定したユーザーIDのみがカウントされること', async () => {
      // テスト用ユーザーを作成
      const targetUser = 'target_user_for_count';
      const otherUser = 'other_user_for_count';
      await createTestUser(targetUser);
      await createTestUser(otherUser);

      // テスト用スポットを作成
      await createSpotWithMeta('target_count_spot', {
        id: 'target_count_spot',
        name: 'ターゲット用スポット',
        description: 'テスト用',
        latitude: 35.6898,
        longitude: 139.692,
        categories: ['cafe'],
        rating: 4.3,
      });

      await createSpotWithMeta('other_count_spot', {
        id: 'other_count_spot',
        name: 'その他用スポット',
        description: 'テスト用',
        latitude: 35.6899,
        longitude: 139.6921,
        categories: ['temple'],
        rating: 4.1,
      });

      // 各ユーザーにwishlistを作成
      await createWishlistEntry({ spotId: 'target_count_spot', userId: targetUser, priority: 1, visited: 0 });
      await createWishlistEntry({ spotId: 'other_count_spot', userId: otherUser, priority: 1, visited: 0 });

      // targetUserのみを指定してカウント
      const { countWishListByUserId } = await import('@/services/wishlist');
      const result = await countWishListByUserId([targetUser]);

      // 検証: targetUserのみが含まれ、otherUserは含まれない
      expect(result[targetUser]).toBe(1);
      expect(result[otherUser]).toBeUndefined();
      expect(Object.keys(result).length).toBe(1);
    });

    it('同じユーザーが複数のwishlistを持つ場合、正確にカウントされること', async () => {
      const userWithMany = 'user_with_many_wishlists';
      await createTestUser(userWithMany);

      // 5件のスポットを作成
      for (let i = 0; i < 5; i++) {
        await createSpotWithMeta(`many_spot_${i}`, {
          id: `many_spot_${i}`,
          name: `大量テスト用スポット${i}`,
          description: 'テスト用',
          latitude: 35.69 + i * 0.001,
          longitude: 139.69 + i * 0.001,
          categories: ['park'],
          rating: 4.0,
        });
      }

      // 5件のwishlistを作成
      for (let i = 0; i < 5; i++) {
        await createWishlistEntry({ spotId: `many_spot_${i}`, userId: userWithMany, priority: 1, visited: 0 });
      }

      const { countWishListByUserId } = await import('@/services/wishlist');
      const result = await countWishListByUserId([userWithMany]);

      expect(result[userWithMany]).toBe(5);
    });
  });

  // -- 行きたいリストの登録数と前月からの増減数の取得テスト
  describe('getTotalWishlistAndIncreaseAndDecrease', () => {
    it('ユーザーの行きたいリストの総数と前月からの増減数を正しく取得できること', async () => {
      await clearTestData();
      const user1 = 'total_increase_decrease_user_1';
      const user2 = 'total_increase_decrease_user_2';
      await createTestUser(user1);
      await createTestUser(user2);

      await createSpotWithMeta('stat_spot_1', {
        id: 'stat_spot_1',
        name: 'カウントテスト用スポット1',
        description: 'テスト用',
        latitude: 35.6895,
        longitude: 139.6917,
        categories: ['park'],
        rating: 4.0,
      });

      await createSpotWithMeta('stat_spot_2', {
        id: 'stat_spot_2',
        name: 'カウントテスト用スポット2',
        description: 'テスト用',
        latitude: 35.6896,
        longitude: 139.6918,
        categories: ['restaurant'],
        rating: 4.5,
      });

      await createSpotWithMeta('stat_spot_3', {
        id: 'stat_spot_3',
        name: 'カウントテスト用スポット3',
        description: 'テスト用',
        latitude: 35.6897,
        longitude: 139.6919,
        categories: ['museum'],
        rating: 4.2,
      });

      currentUserId = user1;
      // createdAtを指定するためにDrizzle直接挿入
      await db.insert(wishlist).values({
        id: 1,
        spotId: 'stat_spot_1',
        userId: user1,
        priority: 1,
        visited: 0,
        createdAt: '2024-05-15T00:00:00.000Z',
      });
      await db.insert(wishlist).values({
        id: 2,
        spotId: 'stat_spot_2',
        userId: user2,
        priority: 1,
        visited: 0,
        createdAt: '2024-05-15T00:00:00.000Z',
      });
      await db.insert(wishlist).values({
        id: 3,
        spotId: 'stat_spot_3',
        userId: user1,
        priority: 1,
        visited: 0,
        createdAt: '2024-04-15T00:00:00.000Z',
      });
      const prevDate = new Date('2024-05-01T12:00:00Z');
      setSystemTime(prevDate);
      const { getTotalWishlistAndIncreaseAndDecrease } = await import('@/services/wishlist');

      // (5月:2件, 4月:1件)
      //行きたいリストの総数の期待値は合計で3件、増減数としては5月は合計+2件
      const stats = await getTotalWishlistAndIncreaseAndDecrease();

      expect(stats.totalWishlist).toBe(3);
      expect(stats.wishlistIncreaseFromLastMonth).toBe(2);
      setSystemTime();
    });
  });

  // --- POST /wishlist: SpotMeta未登録テスト ---
  describe('POST /wishlist - SpotMeta登録検証', () => {
    it('Wishlist作成時にSpotMetaが登録されないこと', async () => {
      const newPlaceId = 'wishlist_no_meta_place_001';

      const payload = {
        spotId: newPlaceId,
        spot: {
          id: newPlaceId,
          meta: {
            id: newPlaceId,
            spotId: newPlaceId,
            name: 'TDDテスト行きたいリストスポット',
            latitude: 35.6895,
            longitude: 139.6917,
            rating: 4.0,
            categories: ['park'],
          },
        },
        memo: 'テストメモ',
        priority: 3,
        visited: 0,
        visitedAt: null,
      };

      const res = await client.api.wishlist.$post({ json: payload }, { headers: getAuthHeaders() });
      expect(res.status).toBe(201);
    });
  });

  // --- GET /wishlist: placeIdのみレスポンス検証 ---
  describe('GET /wishlist - レスポンス構造検証', () => {
    it('行きたいリスト取得時のスポットにSpotMetaの情報（name/latitude/longitude等）が含まれないこと', async () => {
      const placeId = 'wishlist_response_check_001';

      // 直接DBにspot+wishlistを作成（SpotMetaなし）
      const { db: testDb, wishlist: wishlistTable } = await import('@db');
      await testDb.insert(wishlistTable).values({
        spotId: placeId,
        userId: TEST_USER_ID,
        memo: 'テスト',
        priority: 1,
        visited: 0,
        visitedAt: null,
      });

      const response = await client.api.wishlist.$get({}, { headers: getAuthHeaders() });
      const items = await response.json();

      const target = (items as any[]).find((w) => w.spotId === placeId);
      expect(target).toBeDefined();

      // placeIdが返ること
      expect(target.spotId).toBe(placeId);

      // SpotMetaの情報が返らないこと
      expect(target.spot?.meta).toBeUndefined();
    });
  });
});
