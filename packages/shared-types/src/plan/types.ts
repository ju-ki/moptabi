import { z } from 'zod';
import { PlanSchema } from './schema';

export type PlanType = z.infer<typeof PlanSchema>;
