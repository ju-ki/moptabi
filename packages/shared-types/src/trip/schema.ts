import { z } from 'zod';
import { PlanSchema } from '../plan/schema';

export const TripSchema = z.object({
  id: z.number().int().optional(),
  title: z
    .string()
    .min(1, { message: 'タイトルは必須です' })
    .max(50, { message: 'タイトルの上限を超えています。50文字以下で入力してください' }),
  imageUrl: z.string().optional(),
  startDate: z.string({ message: '予定日の開始日を入力してください' }),
  endDate: z.string({ message: '予定日の終了日を入力してください' }),
  plans: z.array(PlanSchema),
});
