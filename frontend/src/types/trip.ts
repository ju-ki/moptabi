import z from 'zod';

import { TripSchema } from '@/models/trip';

export type TripType = z.infer<typeof TripSchema>;
