import { describe, expect, it } from 'vitest';

import {
  UserLocationSchema,
  UserLocationListSchema,
  CreateUserLocationSchema,
  UpdateUserLocationSchema,
  DeleteUserLocationParamSchema,
  UserLocationIdParamSchema,
  MAX_USER_LOCATIONS,
} from '@/models/userLocation';

// 各スキーマに対応したモックデータ
const mockUserLocation = {
  id: 1,
  userId: 'test_userId',
  name: '自宅',
  latitude: 35.6895,
  longitude: 139.6917,
  address: '東京都千代田区千代田1-1',
  label: '自宅',
  usageCount: 5,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('🧾 ユーザーお気に入り地点スキーマ検証', () => {
  // ---- 定数 ----
  describe('定数', () => {
    it('最大登録数が5であること', () => {
      expect(MAX_USER_LOCATIONS).toBe(5);
    });
  });

  // ---- GET: 単一取得 ----
  describe('GET /user-location/:id', () => {
    it('正しいUserLocationレスポンスがスキーマに一致する', () => {
      const result = UserLocationSchema.safeParse(mockUserLocation);
      expect(result.success).toBe(true);
    });

    it('nameがnullでもスキーマに一致する', () => {
      const data = { ...mockUserLocation, name: null };
      const result = UserLocationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('addressがnullでもスキーマに一致する', () => {
      const data = { ...mockUserLocation, address: null };
      const result = UserLocationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('labelがnullでもスキーマに一致する', () => {
      const data = { ...mockUserLocation, label: null };
      const result = UserLocationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('idが文字列の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockUserLocation, id: 'invalid_id' };
      const result = UserLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('緯度が範囲外(-90未満)の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockUserLocation, latitude: -91 };
      const result = UserLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('緯度が範囲外(90超過)の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockUserLocation, latitude: 91 };
      const result = UserLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('経度が範囲外(-180未満)の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockUserLocation, longitude: -181 };
      const result = UserLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('経度が範囲外(180超過)の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockUserLocation, longitude: 181 };
      const result = UserLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('usageCountが負数の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockUserLocation, usageCount: -1 };
      const result = UserLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ---- GET: 一覧取得 ----
  describe('GET /user-location', () => {
    it('一覧レスポンスがUserLocationListSchemaに一致する', () => {
      const mockResponse = [mockUserLocation, mockUserLocation];
      const result = UserLocationListSchema.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });

    it('空配列でもスキーマに一致する', () => {
      const result = UserLocationListSchema.safeParse([]);
      expect(result.success).toBe(true);
    });
  });

  // ---- POST: 作成 ----
  describe('POST /user-location', () => {
    it('正しい作成リクエストがCreateUserLocationSchemaに一致する', () => {
      const mockRequest = {
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
        address: '東京都千代田区千代田1-1',
        label: '自宅',
        isDefault: false,
      };
      const result = CreateUserLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('必須項目のみでもスキーマに一致する', () => {
      const mockRequest = {
        name: '職場',
        latitude: 35.6812,
        longitude: 139.7671,
      };
      const result = CreateUserLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('isDefaultが省略された場合デフォルトでfalseになる', () => {
      const mockRequest = {
        name: '職場',
        latitude: 35.6812,
        longitude: 139.7671,
      };
      const result = CreateUserLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isDefault).toBe(false);
      }
    });

    it('nameが空文字の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        name: '',
        latitude: 35.6895,
        longitude: 139.6917,
      };
      const result = CreateUserLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('nameが256文字以上の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        name: 'a'.repeat(256),
        latitude: 35.6895,
        longitude: 139.6917,
      };
      const result = CreateUserLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('緯度が範囲外の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        name: '自宅',
        latitude: 100,
        longitude: 139.6917,
      };
      const result = CreateUserLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('経度が範囲外の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        name: '自宅',
        latitude: 35.6895,
        longitude: 200,
      };
      const result = CreateUserLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('addressがnullでもスキーマに一致する', () => {
      const mockRequest = {
        name: '自宅',
        latitude: 35.6895,
        longitude: 139.6917,
        address: null,
      };
      const result = CreateUserLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });
  });

  // ---- PATCH: 更新 ----
  describe('PATCH /user-location/:id', () => {
    it('正しい更新リクエストがUpdateUserLocationSchemaに一致する', () => {
      const mockRequest = {
        id: 1,
        name: '新しい自宅',
        latitude: 35.6896,
        longitude: 139.6918,
        address: '東京都千代田区千代田1-2',
        label: '新しいラベル',
        isDefault: true,
      };
      const result = UpdateUserLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('一部のフィールドのみでもスキーマに一致する', () => {
      const mockRequest = {
        id: 1,
        name: '名前だけ更新',
      };
      const result = UpdateUserLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('緯度が範囲外の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        id: 1,
        latitude: -100,
      };
      const result = UpdateUserLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  // ---- DELETE: 削除 ----
  describe('DELETE /user-location/:id', () => {
    it('正しいIDパラメータがスキーマに一致する', () => {
      const result = DeleteUserLocationParamSchema.safeParse({ id: '1' });
      expect(result.success).toBe(true);
    });

    it('数値文字列でないIDはスキーマ不一致になる', () => {
      const result = DeleteUserLocationParamSchema.safeParse({ id: 'abc' });
      expect(result.success).toBe(false);
    });

    it('空文字のIDはスキーマ不一致になる', () => {
      const result = DeleteUserLocationParamSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  // ---- パラメータ: ID取得 ----
  describe('UserLocationIdParamSchema', () => {
    it('正しいIDパラメータがスキーマに一致する', () => {
      const result = UserLocationIdParamSchema.safeParse({ id: '123' });
      expect(result.success).toBe(true);
    });

    it('IDが数値文字列でない場合スキーマ不一致になる', () => {
      const result = UserLocationIdParamSchema.safeParse({ id: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});
