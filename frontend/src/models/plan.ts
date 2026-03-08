import z from 'zod';

import { OpeningHoursSchema } from './spot';
import { TransportSchema } from './transport';
import { DepartureAndDestinationSchema } from './planLocation';

export const PlanSchema = z.object({
  date: z.string(),
  spots: z.array(
    z.object({
      id: z.string(),
      location: z.object({
        id: z.string(),
        name: z.string().min(1, { message: '観光地名は必須です' }),
        lat: z.number().min(-90).max(90, { message: '緯度は -90 から 90 の範囲で指定してください' }),
        lng: z.number().min(-180).max(180, { message: '経度は -180 から 180 の範囲で指定してください' }),
      }),
      stayStart: z.string(),
      stayEnd: z.string(),
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
          name: z.string(),
          walkingTime: z.number(),
          latitude: z.number().min(-90).max(90, { message: '緯度は -90 から 90 の範囲で指定してください' }),
          longitude: z.number().min(-180).max(180, { message: '経度は -180 から 180 の範囲で指定してください' }),
        })
        .optional(),
    }),
  ),
  departure: DepartureAndDestinationSchema,
  destination: DepartureAndDestinationSchema,
});

export const PlanListSchema = z.array(PlanSchema);

export type PlanType = z.infer<typeof PlanSchema>;
export type PlanListType = z.infer<typeof PlanListSchema>;
