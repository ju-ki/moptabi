import { z } from 'zod';
import { NearestStationSchema } from './schema';

export type NearestStationType = z.infer<typeof NearestStationSchema>;
