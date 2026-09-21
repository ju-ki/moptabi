import { z } from 'zod';
import { TripSpotSchema } from '../spot/schema';
import { PlanLocationSchema } from '../planlocation/schema';

export const PlanSchema = z.object({
  date: z.string(),
  spots: z.array(TripSpotSchema),
  memo: z.string().optional(),
  departure: PlanLocationSchema,
  destination: PlanLocationSchema,
});
