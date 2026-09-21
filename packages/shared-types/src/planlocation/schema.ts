import { z } from 'zod';
import { NextTransportSchema } from '../transports/schema';
import { NearestStationSchema } from '../nearestStation/schema';

export const LocationTypeSchema = z.enum(['DEPARTURE', 'DESTINATION', 'SPOT']);

export const PlanLocationSchema = z.object({
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationType: LocationTypeSchema,
  planId: z.number().int().optional(),
  // 履歴の使用回数用
  userLocationId: z.number().int().optional(),
  time: z.string(),
  nearestStation: NearestStationSchema.optional(),
  ...NextTransportSchema.shape,
});
