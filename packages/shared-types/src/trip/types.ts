import { z } from 'zod';

import { TripSchema } from './schema';

export type TripType = z.infer<typeof TripSchema>;
