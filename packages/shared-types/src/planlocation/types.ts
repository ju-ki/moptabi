import { z } from 'zod';
import { PlanLocationSchema } from './schema';

export type PlanLocationType = z.infer<typeof PlanLocationSchema>;
