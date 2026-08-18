import { z } from 'zod';

import { OpeningHoursSchema } from '../trip/schema';

// OpeningHoursSchema は trip ドメインで定義済みのため re-export
export { OpeningHoursSchema };

// スポットのメタ情報スキーマ
export const SpotMetaSchema = z.object({
  id: z.string().optional(),
  spotId: z.string(),
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  image: z.string().optional(),
  url: z.string().optional(),
  prefecture: z.string().optional(),
  address: z.string().optional(),
  rating: z.number(),
  categories: z.array(z.string()).optional(),
  catchphrase: z.string().optional(),
  description: z.string().optional(),
  openingHours: OpeningHoursSchema.optional(),
});

// プランとスポットの中間テーブルスキーマ
export const PlanSpotSchema = z.object({
  planId: z.number(),
  spotId: z.string(),
  stayStart: z.string(),
  stayEnd: z.string(),
  stayDuration: z.number(),
  memo: z.string().optional(),
  order: z.number(),
});

// スポット本体スキーマ
export const SpotSchema = z.object({
  id: z.string(),
  meta: SpotMetaSchema,
  planSpots: PlanSpotSchema.optional(),
});

// ウィッシュリスト形式のスポットスキーマ（id + metaのみ）
export const SpotWithMetaSchema = z.object({
  id: z.string(),
  meta: SpotMetaSchema.nullable(),
});
