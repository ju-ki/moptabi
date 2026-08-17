import { z } from 'zod';

import { NextTransportSchema, StationTypeSchema } from '../transports/schema';
import { NearestStationSchema } from '../nearestStation/schema';

export const OpeningHoursSchema = z.array(
  z.object({
    day: z.string(),
    hours: z.string(),
  }),
);

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
  ratingCount: z.number().optional(),
  categories: z.array(z.string()).optional(),
  catchphrase: z.string().optional(),
  description: z.string().optional(),
  regularOpeningHours: OpeningHoursSchema.optional(),
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
  ...NextTransportSchema.shape,
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

export const TripSpotSchema = z.object({
  id: z.string(),
  stayStart: z.string(),
  stayEnd: z.string(),
  stayDuration: z.number().int().min(0),
  memo: z.string().optional(),
  order: z.number(),
  nearestStation: NearestStationSchema.optional(),
  ...NextTransportSchema.shape,
});
