import z from 'zod';

// Google Map から取得した営業時間を変換したスキーマ
export const OpeningHoursSchema = z.array(
  z.object({
    day: z.string(),
    hours: z.string(),
  }),
);

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
  rating: z.number().min(0).max(5),
  categories: z.array(z.string()).optional(),
  catchphrase: z.string().optional(),
  description: z.string().optional(),
  openingHours: OpeningHoursSchema.optional(),
});

export const PlanSpotSchema = z.object({});

export const SpotSchema = z.object({
  id: z.string(),
  meta: SpotMetaSchema,
  planSpots: PlanSpotSchema.optional(),
});
