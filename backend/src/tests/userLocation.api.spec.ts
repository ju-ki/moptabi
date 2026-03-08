import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { testClient } from 'hono/testing';

import app from '..';
import {
  connectDb,
  disconnectDb,
  clearUserTestData,
  createTestUser,
  createUserLocation,
  deleteUserLocationByUser,
  findUserLocationById,
  countUserLocations,
} from './db-helper';

// テスト用ユーザーID
const TEST_USER_ID = 'userLocation_test_user';
const OTHER_USER_ID = 'userLocation_other_user';

// 現在の認証ユーザーIDを保持する変数
let currentUserId: string | null = TEST_USER_ID;

// 認証ヘッダーを生成するヘルパー関数
function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) {
    return {};
  }
  return { 'X-User-Id': currentUserId };
}

// テスト用のモックデータ
const mockUserLocationData = {
  name: '自宅',
  latitude: 35.6895,
  longitude: 139.6917,
  address: '東京都千代田区千代田1-1',
  label: '自宅',
  isDefault: false,
};

beforeAll(async () => {
  await connectDb();
  // テストデータのクリーンアップ
  await clearUserTestData(TEST_USER_ID);
  await clearUserTestData(OTHER_USER_ID);
  // テストユーザーを作成
  await createTestUser(TEST_USER_ID, 'USER');
  await createTestUser(OTHER_USER_ID, 'USER');
});

afterAll(async () => {
  await clearUserTestData(TEST_USER_ID);
  await clearUserTestData(OTHER_USER_ID);
  await disconnectDb();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  // 各テスト前にUserLocationをクリア
  await deleteUserLocationByUser(TEST_USER_ID);
  await deleteUserLocationByUser(OTHER_USER_ID);
});

describe('🧾 ユーザーお気に入り地点APIテスト', () => {
  const client = testClient(app) as any;

  // ========================================
  // GET /api/userLocation - 一覧取得
  // ========================================
  describe('GET /api/userLocation', () => {
    it('未認証の場合は401を返す', async () => {
      currentUserId = null;
      const response = await client.api['userLocation'].$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(401);
    });

    it('登録がない場合は空配列を返す', async () => {
      const response = await client.api['userLocation'].$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('自分の登録した地点のみ取得できる', async () => {
      // テストユーザーの地点を作成
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
      });
      // 他のユーザーの地点を作成
      await createUserLocation({
        userId: OTHER_USER_ID,
        name: '他人の自宅',
        latitude: 35.0,
        longitude: 139.0,
      });

      const response = await client.api['userLocation'].$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('自宅');
      expect(data[0].userId).toBe(TEST_USER_ID);
    });

    it('複数の登録地点を取得できる', async () => {
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
      });
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '職場',
        latitude: 35.6812,
        longitude: 139.7671,
      });

      const response = await client.api['userLocation'].$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.length).toBe(2);
    });

    it('使用回数順でソートされている', async () => {
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
        usageCount: 5,
      });
      await createUserLocation({
        userId: TEST_USER_ID,
        name: '職場',
        latitude: 35.6812,
        longitude: 139.7671,
        usageCount: 10,
      });

      const response = await client.api['userLocation'].$get({}, { headers: getAuthHeaders() });
      expect(response.status).toBe(200);
      const data = await response.json();
      // 使用回数が多い順
      expect(data[0].name).toBe('職場');
      expect(data[1].name).toBe('自宅');
    });
  });

  // ========================================
  // POST /api/userLocation - 作成
  // ========================================
  describe('POST /api/userLocation', () => {
    it('未認証の場合は401を返す', async () => {
      currentUserId = null;
      const response = await client.api['userLocation'].$post(
        { json: mockUserLocationData },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(401);
    });

    it('正常に地点を登録できる', async () => {
      const response = await client.api['userLocation'].$post(
        { json: mockUserLocationData },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('自宅');
      expect(data.latitude).toBe(35.6895);
      expect(data.longitude).toBe(139.6917);
      expect(data.userId).toBe(TEST_USER_ID);
    });

    it('必須項目のみで登録できる', async () => {
      const minimalData = {
        name: '職場',
        latitude: 35.6812,
        longitude: 139.7671,
        isDefault: false,
      };
      const response = await client.api['userLocation'].$post({ json: minimalData }, { headers: getAuthHeaders() });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('職場');
      expect(data.isDefault).toBe(false);
    });

    it('最大5件まで登録できる', async () => {
      // 5件登録
      for (let i = 0; i < 5; i++) {
        const response = await client.api['userLocation'].$post(
          {
            json: {
              name: `地点${i}`,
              latitude: 35.0 + i * 0.1,
              longitude: 139.0 + i * 0.1,
            },
          },
          { headers: getAuthHeaders() },
        );
        expect(response.status).toBe(201);
      }

      // 6件目は登録できない
      const response = await client.api['userLocation'].$post(
        {
          json: {
            name: '地点6',
            latitude: 35.4,
            longitude: 139.4,
          },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(400);
    });

    it('nameが空文字の場合は400を返す', async () => {
      const response = await client.api['userLocation'].$post(
        {
          json: {
            name: '',
            latitude: 35.6895,
            longitude: 139.6917,
          },
        },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(400);
    });

    it('緯度が範囲外の場合は400を返す', async () => {
      const response = await client.api['userLocation'].$post(
        {
          json: {
            name: '自宅',
            latitude: 100, // 範囲外
            longitude: 139.6917,
          },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(400);
    });

    it('経度が範囲外の場合は400を返す', async () => {
      const response = await client.api['userLocation'].$post(
        {
          json: {
            name: '自宅',
            latitude: 35.6895,
            longitude: 200, // 範囲外
          },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(400);
    });

    it('isDefaultがtrueの場合、既存のデフォルトが解除される', async () => {
      // 最初のデフォルト地点を作成
      const first = await createUserLocation({
        userId: TEST_USER_ID,
        name: '最初のデフォルト',
        latitude: 35.0,
        longitude: 139.0,
        isDefault: true,
      });

      // 新しいデフォルト地点を作成
      const response = await client.api['userLocation'].$post(
        {
          json: {
            name: '新しいデフォルト',
            latitude: 35.1,
            longitude: 139.1,
            isDefault: true,
          },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(201);

      // 最初の地点のデフォルトが解除されているか確認
      const updatedFirst = await findUserLocationById(first.id);
      expect(updatedFirst?.isDefault).toBe(false);
    });
  });

  // ========================================
  // PATCH /api/userLocation/:id - 更新
  // ========================================
  describe('PATCH /api/userLocation/:id', () => {
    it('未認証の場合は401を返す', async () => {
      currentUserId = null;
      const response = await client.api.userLocation['1'].$patch(
        { json: { name: '更新' } },
        { headers: getAuthHeaders() },
      );

      expect(response.status).toBe(401);
    });

    it('存在しないIDの場合は404を返す', async () => {
      const response = await client.api.userLocation[':id'].$patch(
        { param: { id: '99999' }, json: { name: '更新' } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(404);
    });

    it('他人の地点は更新できない', async () => {
      const created = await createUserLocation({
        userId: OTHER_USER_ID,
        name: '他人の自宅',
        latitude: 35.0,
        longitude: 139.0,
      });

      const response = await client.api.userLocation[':id'].$patch(
        { param: { id: String(created.id) }, json: { name: '乗っ取り' } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(404);
    });

    it('自分の地点を更新できる', async () => {
      const created = await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
      });

      const response = await client.api.userLocation[':id'].$patch(
        {
          param: { id: created.id },
          json: {
            name: '新しい自宅',
            latitude: 35.7,
            longitude: 139.7,
          },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('新しい自宅');
      expect(data.latitude).toBe(35.7);
    });

    it('一部のフィールドのみ更新できる', async () => {
      const created = await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
        address: '東京都千代田区千代田1-1',
      });

      const response = await client.api.userLocation[':id'].$patch(
        {
          param: { id: created.id },
          json: { name: '新しい名前だけ更新' },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('新しい名前だけ更新');
      // 他のフィールドは変更されていない
      expect(data.latitude).toBe(35.6895);
      expect(data.address).toBe('東京都千代田区千代田1-1');
    });

    it('isDefaultをtrueに更新すると既存のデフォルトが解除される', async () => {
      const first = await createUserLocation({
        userId: TEST_USER_ID,
        name: '最初のデフォルト',
        latitude: 35.0,
        longitude: 139.0,
        isDefault: true,
      });
      const second = await createUserLocation({
        userId: TEST_USER_ID,
        name: '2番目',
        latitude: 35.1,
        longitude: 139.1,
        isDefault: false,
      });

      // 2番目をデフォルトに更新
      const response = await client.api.userLocation[':id'].$patch(
        {
          param: { id: second.id },
          json: { isDefault: true },
        },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(200);

      // 最初のデフォルトが解除されているか確認
      const updatedFirst = await findUserLocationById(first.id);
      expect(updatedFirst?.isDefault).toBe(false);
    });
  });

  // ========================================
  // DELETE /api/userLocation/:id - 削除
  // ========================================
  describe('DELETE /api/userLocation/:id', () => {
    it('未認証の場合は401を返す', async () => {
      currentUserId = null;
      const response = await client.api['userLocation'][':id'].$delete(
        { param: { id: '1' } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(401);
    });

    it('存在しないIDの場合は404を返す', async () => {
      const response = await client.api['userLocation'][':id'].$delete(
        { param: { id: '99999' } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(404);
    });

    it('他人の地点は削除できない', async () => {
      const created = await createUserLocation({
        userId: OTHER_USER_ID,
        name: '他人の自宅',
        latitude: 35.0,
        longitude: 139.0,
      });

      const response = await client.api['userLocation'][':id'].$delete(
        { param: { id: created.id } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(404);

      // 削除されていないことを確認
      const stillExists = await findUserLocationById(created.id);
      expect(stillExists).not.toBeNull();
    });

    it('自分の地点を削除できる', async () => {
      const created = await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
      });

      const response = await client.api['userLocation'][':id'].$delete(
        { param: { id: created.id } },
        { headers: getAuthHeaders() },
      );
      expect(response.status).toBe(204);

      // 削除されていることを確認
      const deleted = await findUserLocationById(created.id);
      expect(deleted).toBeNull();
    });

    it('削除後にカウントが減少する', async () => {
      const created = await createUserLocation({
        userId: TEST_USER_ID,
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
      });

      const beforeCount = await countUserLocations(TEST_USER_ID);
      expect(beforeCount).toBe(1);

      await client.api['userLocation'][':id'].$delete({ param: { id: created.id } }, { headers: getAuthHeaders() });

      const afterCount = await countUserLocations(TEST_USER_ID);
      expect(afterCount).toBe(0);
    });
  });
});
