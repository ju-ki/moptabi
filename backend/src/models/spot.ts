import { z } from '@hono/zod-openapi';

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

export const PlanSpotSchema = z.object({});

export const SpotSchema = z.object({
  id: z.string().openapi({ example: 'testId' }),
  meta: SpotMetaSchema,
  planSpots: PlanSpotSchema.optional(),
});
