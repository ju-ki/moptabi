import { z } from 'zod';

/** 共通のソート順スキーマ */
export const SortOrderSchema = z.enum(['asc', 'desc']);
