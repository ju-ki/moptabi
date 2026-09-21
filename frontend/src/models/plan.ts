import z from 'zod';

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

export type CoordinationType = z.infer<typeof CoordinationSchema>;
