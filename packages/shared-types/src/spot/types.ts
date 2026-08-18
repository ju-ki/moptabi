import { z } from 'zod';

import { OpeningHoursSchema, PlanSpotSchema, SpotMetaSchema, SpotSchema, SpotWithMetaSchema } from './schema';

export type OpeningHoursType = z.infer<typeof OpeningHoursSchema>;
export type SpotMetaType = z.infer<typeof SpotMetaSchema>;
export type PlanSpotType = z.infer<typeof PlanSpotSchema>;
export type SpotType = z.infer<typeof SpotSchema>;
export type SpotWithMetaType = z.infer<typeof SpotWithMetaSchema>;
