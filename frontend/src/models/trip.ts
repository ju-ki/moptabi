import z from 'zod';

import type { Transport, TripInfo } from '@/types/plan';

import { PlanListSchema } from './plan';

import type { TripDetailResponseType as TripDetailResponseContractType } from '@shared/trip/types';
import type { DepartureAndDestinationType } from './planLocation';

export const TripSchema = z.object({
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

/**
 * Trip詳細APIのスポット型。
 * shared契約を土台にしつつ、frontend側で利用中のTransport型へ合わせる。
 */
export type TripDetailApiSpot = Omit<TripDetailResponseContractType['plans'][number]['spots'][number], 'transports'> & {
  transports: Transport;
};

/**
 * Trip詳細APIのプラン型。
 * 出発地・目的地は frontend 側で利用している拡張型を維持する。
 */
export type TripDetailApiPlan = Omit<
  TripDetailResponseContractType['plans'][number],
  'spots' | 'departure' | 'destination'
> & {
  spots: TripDetailApiSpot[];
  departure: DepartureAndDestinationType;
  destination: DepartureAndDestinationType;
};

/**
 * Trip詳細APIレスポンス型。
 * 契約型との差分を明示しつつ、frontend の補完処理に必要な形へ揃える。
 */
export type TripDetailApiResponse = Omit<TripDetailResponseContractType, 'tripInfo' | 'plans'> & {
  tripInfo: TripInfo[];
  plans: TripDetailApiPlan[];
};
