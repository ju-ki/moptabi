import z from 'zod';

import { OpeningHoursSchema } from './spot';
import { TransportSchema } from './transport';
import { DepartureAndDestinationSchema } from './planLocation';

/** 出発地・目的地で共通利用する最小ロケーション型 */
export const LocationSchema = DepartureAndDestinationSchema.pick({
  name: true,
  latitude: true,
  longitude: true,
});

/** プラン内スポットで共通利用する座標型 */
export const CoordinationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: '観光地名は必須です' }),
  lat: z.number().min(-90).max(90, { message: '緯度は -90 から 90 の範囲で指定してください' }),
  lng: z.number().min(-180).max(180, { message: '経度は -180 から 180 の範囲で指定してください' }),
});

export const PlanSchema = z.object({
  date: z.string(),
  spots: z.array(
    z.object({
      id: z.string(),
      location: CoordinationSchema,
      stayStart: z.string(),
      stayEnd: z.string(),
      stayDuration: z.number().int().min(0),
      memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
      image: z.string().optional(),
      url: z.string().optional(),
      prefecture: z.string().optional(),
      address: z.string().optional(),
      rating: z.number().optional(),
      category: z.array(z.string()).optional(),
      catchphrase: z.string().optional(),
      description: z.string().optional(),
      regularOpeningHours: OpeningHoursSchema.optional(),
      transports: TransportSchema,
      order: z.number().default(0),
      nearestStation: z
        .object({
          placeId: z.string(),
          stationType: z.enum(['BUS', 'TRAIN', 'OTHER']),
          name: z.string().optional(),
          walkingTime: z.number().optional(),
          latitude: z.number().min(-90).max(90, { message: '緯度は -90 から 90 の範囲で指定してください' }),
          longitude: z.number().min(-180).max(180, { message: '経度は -180 から 180 の範囲で指定してください' }),
          transitTime: z.number().int().min(0).optional(),
          scheduledDepartureTime: z.string().optional(),
          transitMemo: z.string().max(1000, { message: 'メモは1000文 字以内で記載をお願いします' }).optional(),
        })
        .optional(),
    }),
  ),
  departure: DepartureAndDestinationSchema,
  destination: DepartureAndDestinationSchema,
});

export const PlanListSchema = z.array(PlanSchema);

export type LocationType = z.infer<typeof LocationSchema>;
export type CoordinationType = z.infer<typeof CoordinationSchema>;
export type PlanType = z.infer<typeof PlanSchema>;
export type PlanListType = z.infer<typeof PlanListSchema>;
