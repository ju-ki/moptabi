import { z } from 'zod';
import { StationTypeSchema } from '../transports/schema';

export const NearestStationSchema = z.object({
  planSpotId: z.number().int().optional(),
  placeId: z.string().min(1, { message: 'placeIdは必須です' }),
  stationType: StationTypeSchema,
  transitTime: z.number().int().min(0),
  scheduledDepartureTime: z.string().optional(),
  /** 駅到着から発車までの待ち時間（分） */
  waitingTime: z.number().int().min(0).optional(),
  memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
});
