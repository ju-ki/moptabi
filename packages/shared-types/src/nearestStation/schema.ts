import { z } from 'zod';
import { StationTypeSchema } from '../transports/schema';

export const NearestStationSchema = z.object({
  planSpotId: z.number().int().optional(),
  placeId: z.string().min(1, { message: 'placeIdは必須です' }),
  stationType: StationTypeSchema,
  transitTime: z.number().int().min(0),
  waitingTime: z.number().int().min(0),
  scheduledDepartureTime: z.string().optional(),
  memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
});
