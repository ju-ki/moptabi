import { z } from 'zod';

import { SortOrderSchema } from './schema';

export type SortOrder = z.infer<typeof SortOrderSchema>;
