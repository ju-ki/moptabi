import { describe, expect, it } from 'vitest';

import {
  PlanLocationSchema,
  PlanLocationListSchema,
  CreatePlanLocationSchema,
  PlanLocationIdParamSchema,
  PlanLocationCandidateQuerySchema,
  PlanLocationCandidateResponseSchema,
  LocationTypeEnum,
} from '@/models/planLocation';

// 各スキーマに対応したモックデータ
const mockPlanLocation = {
  id: 1,
  userId: 'test_userId',
  name: '2025-01-15_出発地',
  latitude: 35.6895,
  longitude: 139.6917,
  address: '東京都千代田区千代田1-1',
  locationType: 'DEPARTURE' as const,
  planId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('🧾 プラン作成時の出発地・目的地スキーマ検証', () => {
  // ---- LocationTypeEnum ----
  describe('LocationTypeEnum', () => {
    it('DEPARTUREが有効な値である', () => {
      const result = LocationTypeEnum.safeParse('DEPARTURE');
      expect(result.success).toBe(true);
    });

    it('DESTINATIONが有効な値である', () => {
      const result = LocationTypeEnum.safeParse('DESTINATION');
      expect(result.success).toBe(true);
    });

    it('無効な値はスキーマ不一致になる', () => {
      const result = LocationTypeEnum.safeParse('INVALID');
      expect(result.success).toBe(false);
    });
  });

  // ---- GET: 単一取得 ----
  describe('GET /plan-location/:id', () => {
    it('正しいPlanLocationレスポンスがスキーマに一致する', () => {
      const result = PlanLocationSchema.safeParse(mockPlanLocation);
      expect(result.success).toBe(true);
    });

    it('addressがnullでもスキーマに一致する', () => {
      const data = { ...mockPlanLocation, address: null };
      const result = PlanLocationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('planIdがnullでもスキーマに一致する', () => {
      const data = { ...mockPlanLocation, planId: null };
      const result = PlanLocationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('locationTypeがDESTINATIONでもスキーマに一致する', () => {
      const data = { ...mockPlanLocation, locationType: 'DESTINATION' };
      const result = PlanLocationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('idが文字列の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockPlanLocation, id: 'invalid_id' };
      const result = PlanLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('緯度が範囲外の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockPlanLocation, latitude: 100 };
      const result = PlanLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('経度が範囲外の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockPlanLocation, longitude: 200 };
      const result = PlanLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('locationTypeが無効な値の場合スキーマ不一致になる', () => {
      const invalidData = { ...mockPlanLocation, locationType: 'INVALID' };
      const result = PlanLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ---- GET: 一覧取得 ----
  describe('GET /plan-location', () => {
    it('一覧レスポンスがPlanLocationListSchemaに一致する', () => {
      const mockResponse = [mockPlanLocation, mockPlanLocation];
      const result = PlanLocationListSchema.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });

    it('空配列でもスキーマに一致する', () => {
      const result = PlanLocationListSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('異なるlocationTypeの混在でもスキーマに一致する', () => {
      const mockResponse = [
        mockPlanLocation,
        { ...mockPlanLocation, id: 2, locationType: 'DESTINATION' },
        { ...mockPlanLocation, id: 3, locationType: 'DEPARTURE' },
      ];
      const result = PlanLocationListSchema.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });
  });

  // ---- POST: 作成 ----
  describe('POST /plan-location', () => {
    it('正しい作成リクエストがCreatePlanLocationSchemaに一致する', () => {
      const mockRequest = {
        name: '2025-01-15_出発地',
        latitude: 35.6895,
        longitude: 139.6917,
        address: '東京都千代田区千代田1-1',
        locationType: 'DEPARTURE',
        planId: 1,
      };
      const result = CreatePlanLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('必須項目のみでもスキーマに一致する', () => {
      const mockRequest = {
        latitude: 35.6812,
        longitude: 139.7671,
        locationType: 'DESTINATION',
      };
      const result = CreatePlanLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('nameが省略された場合スキーマに一致する（サーバーで日付_出発地を生成）', () => {
      const mockRequest = {
        latitude: 35.6812,
        longitude: 139.7671,
        locationType: 'DEPARTURE',
      };
      const result = CreatePlanLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('nameが101文字以上の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        name: 'a'.repeat(101),
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
      };
      const result = CreatePlanLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('緯度が範囲外の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        latitude: 100,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
      };
      const result = CreatePlanLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('経度が範囲外の場合スキーマ不一致になる', () => {
      const invalidRequest = {
        latitude: 35.6895,
        longitude: 200,
        locationType: 'DEPARTURE',
      };
      const result = CreatePlanLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('locationTypeが必須である', () => {
      const invalidRequest = {
        latitude: 35.6895,
        longitude: 139.6917,
      };
      const result = CreatePlanLocationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('addressがnullでもスキーマに一致する', () => {
      const mockRequest = {
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        address: null,
      };
      const result = CreatePlanLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('planIdがnullでもスキーマに一致する', () => {
      const mockRequest = {
        latitude: 35.6895,
        longitude: 139.6917,
        locationType: 'DEPARTURE',
        planId: null,
      };
      const result = CreatePlanLocationSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });
  });

  // ---- パラメータ: ID取得 ----
  describe('PlanLocationIdParamSchema', () => {
    it('正しいIDパラメータがスキーマに一致する', () => {
      const result = PlanLocationIdParamSchema.safeParse({ id: '123' });
      expect(result.success).toBe(true);
    });

    it('IDが数値文字列でない場合スキーマ不一致になる', () => {
      const result = PlanLocationIdParamSchema.safeParse({ id: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('空文字のIDはスキーマ不一致になる', () => {
      const result = PlanLocationIdParamSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  // ---- クエリパラメータ: 候補取得 ----
  describe('PlanLocationCandidateQuerySchema', () => {
    it('全てのパラメータが指定された場合スキーマに一致する', () => {
      const query = {
        locationType: 'DEPARTURE',
        search: '東京',
        limit: 20,
      };
      const result = PlanLocationCandidateQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('パラメータが省略された場合デフォルト値が設定される', () => {
      const result = PlanLocationCandidateQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it('limitが1未満の場合スキーマ不一致になる', () => {
      const query = { limit: 0 };
      const result = PlanLocationCandidateQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('limitが50超過の場合スキーマ不一致になる', () => {
      const query = { limit: 51 };
      const result = PlanLocationCandidateQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('locationTypeがDESTINATIONでもスキーマに一致する', () => {
      const query = { locationType: 'DESTINATION' };
      const result = PlanLocationCandidateQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('limitが文字列でも数値に変換される', () => {
      const query = { limit: '15' };
      const result = PlanLocationCandidateQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(15);
      }
    });
  });

  // ---- 候補レスポンス ----
  describe('PlanLocationCandidateResponseSchema', () => {
    it('正しい候補レスポンスがスキーマに一致する', () => {
      const response = {
        favorites: [
          {
            name: '自宅',
            latitude: 35.6895,
            longitude: 139.6917,
            address: '東京都千代田区千代田1-1',
            label: '自宅',
            isDefault: true,
            locationType: 'SPOT' as const,
            usageCount: 5,
            planId: null,
            planName: null,
            userLocationId: 1,
            planLocationId: null,
          },
        ],
        history: [
          {
            name: '2025-01-15_出発地',
            latitude: 35.6812,
            longitude: 139.7671,
            address: null,
            label: '',
            isDefault: false,
            locationType: 'DEPARTURE' as const,
            usageCount: 0,
            planId: null,
            planName: 'テストプラン',
            userLocationId: null,
            planLocationId: 1,
          },
        ],
      };
      const result = PlanLocationCandidateResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('favoritesとhistoryが空配列でもスキーマに一致する', () => {
      const response = {
        favorites: [],
        history: [],
      };
      const result = PlanLocationCandidateResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
