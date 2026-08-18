import { z } from 'zod';

import { DepartureAndDestinationSchema, TripDetailResponseSchema, TripSchema, TransportSchema } from './schema';

export type TransportType = z.infer<typeof TransportSchema>;
export type TripType = z.infer<typeof TripSchema>;
export type DepartureAndDestinationType = z.infer<typeof DepartureAndDestinationSchema>;
export type TripDetailResponseType = z.infer<typeof TripDetailResponseSchema>;
