import { describe, it, expect } from 'vitest';

import {
  WishlistSchema,
  WishlistListResponseSchema,
  WishlistCreateSchema,
  WishlistUpdateSchema,
} from '@/models/wishlist';

// 各スキーマに対応したモックデータ
const mockSpot = {
  id: 'spot_abc123',
  meta: {
    id: 'spot_abc123',
    spotId: 'spot_abc123',
    name: '東京タワー',
    description: '夜景が綺麗なスポット',
    latitude: 35.6586,
    longitude: 139.7454,
    categories: ['観光', '夜景'],
    image: 'https://example.com/tower.jpg',
    url: 'https://example.com/cafe',
    prefecture: '東京都',
    address: '東京都渋谷区神南1-19-11',
    rating: 4.7,
    catchphrase: '東京の象徴',
  },
};

const mockWishlist = {
  id: 1,
  spotId: 'spot_abc123',
  userId: 'user_001',
  memo: '夜景が綺麗らしい',
  priority: 3,
  visited: 0,
  visitedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  spot: mockSpot,
};

describe('🧾 行きたいリストスキーマ検証', () => {
  // ---- GET: 一覧取得 ----
  describe('GET /wishlist', () => {
    it('行きたいリスト一覧レスポンスが WishlistListResponseSchema に一致する', () => {
      const mockResponse = [mockWishlist, mockWishlist];
      const result = WishlistListResponseSchema.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });

    it('空配列でもスキーマに一致する', () => {
      const result = WishlistListResponseSchema.safeParse([]);
      expect(result.success).toBe(true);
    });
  });

  // ---- POST: 作成 ----
  describe('POST /wishlist', () => {
    it('正しい作成リクエストが WishlistCreateSchema に一致する', () => {
      const mockRequest = {
        spotId: 'spot_abc123',
        spot: mockSpot,
        memo: '夜景が綺麗らしい',
        priority: 3,
        visited: 0,
        visitedAt: null,
      };
      const result = WishlistCreateSchema.safeParse(mockRequest);
      expect(result.success).toBe(true);
    });

    it('不正な priority(範囲外)はスキーマ不一致になる', () => {
      const invalidRequest = {
        ...mockWishlist,
        priority: 6, // 不正
      };
      const result = WishlistCreateSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('memoが空でも問題なくスキーマ一致になること', () => {
      const invalidRequest = {
        ...mockWishlist,
        memo: '',
      };
      const result = WishlistCreateSchema.safeParse(invalidRequest);
      expect(result.success).toBe(true);
    });

    it('memoがnullでも問題なくスキーマ一致になること', () => {
      const invalidRequest = {
        ...mockWishlist,
        memo: null,
      };
      const result = WishlistCreateSchema.safeParse(invalidRequest);
      expect(result.success).toBe(true);
    });

    it('visitedAtがnullでも問題なくスキーマ一致になること', () => {
      const invalidRequest = {
        ...mockWishlist,
        visitedAt: null,
      };
      const result = WishlistCreateSchema.safeParse(invalidRequest);
      expect(result.success).toBe(true);
    });
  });

  // ---- PATCH: 更新 ----
  describe('PATCH /wishlist/:id', () => {
    it('正しい更新リクエストが WishlistUpdateSchema に一致する', () => {
      const mockUpdate = {
        id: 1,
        memo: '感想を更新',
        priority: 4,
        visited: 1,
        visitedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = WishlistUpdateSchema.safeParse(mockUpdate);
      expect(result.success).toBe(true);
    });

    it('不正な visitedAt 形式はスキーマ不一致になる', () => {
      const invalidUpdate = {
        id: 1,
        memo: 'テスト',
        priority: 3,
        visited: 1,
        visitedAt: 'not-a-date',
        createdAt: '2025-10-15T12:00:00Z',
        updatedAt: '2025-10-20T09:05:00Z',
      };
      const result = WishlistUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  // ---- 共通スキーマ単体検証 ----
  describe('WishlistSchema 単体', () => {
    it('正しいWishlistオブジェクトがスキーマに一致する', () => {
      const result = WishlistSchema.safeParse(mockWishlist);
      expect(result.success).toBe(true);
    });

    it('priorityが文字列だと不一致となる', () => {
      const invalidWishlist = { ...mockWishlist, priority: 'high' };
      const result = WishlistSchema.safeParse(invalidWishlist);
      expect(result.success).toBe(false);
    });

    it('visitedAtがnullでも一致する', () => {
      const wishlistWithNull = { ...mockWishlist, visitedAt: null };
      const result = WishlistSchema.safeParse(wishlistWithNull);
      expect(result.success).toBe(true);
    });
  });
});
