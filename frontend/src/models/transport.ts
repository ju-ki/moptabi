import z from 'zod';

// 地点の種別
export const LocationTypeEnum = z.enum(['DEPARTURE', 'DESTINATION', 'SPOT']);
export const TransportMethodEnum = z.enum(['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING', 'DEFAULT']);

export const TransportSchema = z.object({
  transportMethod: z.number().min(1, { message: '移動手段を選択してください' }),
  travelTime: z.string().optional(),
  name: TransportMethodEnum,
  cost: z.number().optional(),
  planId: z.number().optional(),
  toSpotId: z.number().optional(),
  fromSpotId: z.number().optional(),
  fromType: LocationTypeEnum,
  toType: LocationTypeEnum,
});
