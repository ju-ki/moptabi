import { z } from '@hono/zod-openapi';

// ========================================
// クエリパラメータスキーマ
// ========================================

/**
 * 未訪問スポット（行きたいリスト）のクエリパラメータスキーマ
 */
export const UnvisitedSpotsQuerySchema = z.object({
  prefecture: z.string().optional().openapi({
    description: '都道府県でフィルタリング',
    example: '東京都',
  }),
  priority: z.coerce.number().min(1).max(5).optional().openapi({
    description: '優先度でフィルタリング（1-5）',
    example: 3,
  }),
  sortBy: z.enum(['priority', 'createdAt']).default('priority').openapi({
    description: 'ソート順（priority: 優先度順, createdAt: 追加日順）',
    example: 'priority',
  }),
  sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
    description: 'ソート方向（asc: 昇順, desc: 降順）',
    example: 'desc',
  }),
});

/**
 * 訪問済みスポットのクエリパラメータスキーマ
 */
export const VisitedSpotsQuerySchema = z.object({
  prefecture: z.string().optional().openapi({
    description: '都道府県でフィルタリング',
    example: '東京都',
  }),
  dateFrom: z.string().optional().openapi({
    description: '期間フィルター（開始日）YYYY-MM-DD形式',
    example: '2024-01-01',
  }),
  dateTo: z.string().optional().openapi({
    description: '期間フィルター（終了日）YYYY-MM-DD形式',
    example: '2024-12-31',
  }),
  minVisitCount: z.coerce.number().min(1).optional().openapi({
    description: '最小訪問回数（指定した回数以上訪問・計画したスポットのみ）',
    example: 2,
  }),
  sortBy: z.enum(['visitedAt', 'createdAt', 'planDate', 'visitCount']).default('visitedAt').openapi({
    description: 'ソート順（visitedAt: 訪問日順, createdAt: 追加日順, planDate: 計画日順, visitCount: 訪問回数順）',
    example: 'visitedAt',
  }),
  sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
    description: 'ソート方向（asc: 昇順, desc: 降順）',
    example: 'desc',
  }),
});

// クエリパラメータの型をエクスポート
export type UnvisitedSpotsQuery = z.infer<typeof UnvisitedSpotsQuerySchema>;
export type VisitedSpotsQuery = z.infer<typeof VisitedSpotsQuerySchema>;

// ========================================
// スポット関連スキーマ
// ========================================

// Google Map から取得した営業時間を変換したスキーマ
export const OpeningHoursSchema = z.array(
  z.object({
    day: z.string().openapi({ example: '月' }),
    hours: z.string().openapi({ example: '9:00-18:00' }),
  }),
);

export const SpotMetaSchema = z.object({
  id: z.string(),
  spotId: z.string().openapi({ example: 'spot_abc123' }),
  name: z.string().openapi({ example: '有名な観光地' }),
  latitude: z.number().min(-90).max(90).openapi({ example: 35.6622 }),
  longitude: z.number().min(-180).max(180).openapi({ example: 134.6622 }),
  image: z.string().optional().openapi({ example: 'https://example.com' }),
  url: z.string().optional().openapi({ example: 'https://example.com' }),
  prefecture: z.string().optional().openapi({ example: '東京都' }),
  address: z.string().optional().openapi({ example: '東京都千代田区千代田1-1' }),
  rating: z.number().openapi({ example: 4.2 }),
  categories: z
    .array(z.string())
    .optional()
    .openapi({ example: ['park'] }),
  catchphrase: z.string().optional().openapi({ example: '夜景が綺麗な場所です' }),
  description: z.string().optional().openapi({ example: '家族連れにおすすめです' }),
  openingHours: OpeningHoursSchema.optional().openapi({
    description: 'Google Maps から取得した営業時間情報',
  }),
});

export const PlanSpotSchema = z.object({
  planId: z.number().openapi({ example: 1 }),
  spotId: z.string().openapi({ example: 'spot_abc123' }),
  stayStart: z.string().openapi({ example: '2025-12-01T10:00:00Z' }),
  stayEnd: z.string().openapi({ example: '2025-12-01T12:00:00Z' }),
  memo: z.string().optional().openapi({ example: 'ここでランチを食べる予定' }),
  order: z.number().openapi({ example: 1 }),
});

export const SpotSchema = z.object({
  id: z.string().openapi({ example: 'testId' }),
  meta: SpotMetaSchema,
  planSpots: PlanSpotSchema.optional(),
});

// スポット検索用のレスポンススキーマ（Wishlist形式）
export const SpotWithWishlistSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  spotId: z.string().openapi({ example: 'spot_abc123' }),
  userId: z.string().openapi({ example: 'user_001' }),
  memo: z.string().nullable().openapi({ example: 'メモ' }),
  priority: z.number().min(1).max(5).openapi({ example: 3 }),
  visited: z.number().openapi({ example: 0 }),
  visitedAt: z.coerce.date().nullable().openapi({ example: null }),
  createdAt: z.coerce.date().openapi({ example: '2025-10-15T12:00:00Z' }),
  updatedAt: z.coerce.date().openapi({ example: '2025-10-15T12:05:00Z' }),
  spot: z.object({
    id: z.string().openapi({ example: 'spot_abc123' }),
    meta: SpotMetaSchema.nullable(),
  }),
});

// 未訪問スポットのレスポンススキーマ
export const UnvisitedSpotsResponseSchema = z.array(SpotWithWishlistSchema).openapi({
  description: '未訪問の行きたいリスト（優先度順）',
});

// 訪問済み・過去スポットのレスポンススキーマ
export const VisitedSpotsResponseSchema = z.array(SpotWithWishlistSchema).openapi({
  description: '訪問済み・過去に登録したスポット',
});
