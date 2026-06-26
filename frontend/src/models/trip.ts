import z from 'zod';

import type { Transport, TripInfo } from '@/types/plan';

import { PlanListSchema } from './plan';

import type { TripDetailResponseType as TripDetailResponseContractType } from '@shared/trip/types';

export const TripSchema = z.object({
  id: z.number().optional(),
  title: z
    .string()
    .min(1, { message: 'タイトルは必須です' })
    .max(50, { message: 'タイトルの上限を超えています。50文字以下で入力してください' }),
  imageUrl: z.string().optional(),
  startDate: z.string({ message: '予定日の開始日を入力してください' }),
  endDate: z.string({ message: '予定日の終了日を入力してください' }),
  tripInfo: z.array(
    z.object({
      date: z.string(),
      genreId: z.number().default(1),
      transportationMethod: z.number().min(1, { message: '移動手段を選択してください' }),
      memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
    }),
  ),
  plans: PlanListSchema,
});

export type TripType = z.infer<typeof TripSchema>;

/** 旅行プラン一覧APIで利用する最小構成の型 */
export type TripListItem = Pick<TripType, 'title' | 'imageUrl' | 'startDate' | 'endDate'> & {
  id: number;
};

/** Trip詳細APIレスポンス型（shared契約型をそのまま利用） */
export type TripDetailApiResponse = TripDetailResponseContractType;
export type TripDetailApiPlan = TripDetailApiResponse['plans'][number];
export type TripDetailApiSpot = TripDetailApiPlan['spots'][number];
export type TripDetailApiNearestStation = TripDetailApiSpot['nearestStation'];

/** frontend補完後の詳細レスポンス型 */
export type TripDetailApiResponseEnriched = Omit<TripType, 'tripInfo'> & {
  tripInfo: TripInfo[];
  plans: Array<{
    date: string;
    spots: Array<Omit<TripDetailApiSpot, 'transports'> & { transports: Transport }>;
  }>;
};
