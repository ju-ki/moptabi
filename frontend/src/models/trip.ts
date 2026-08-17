import z from 'zod';
import { TripType } from '@shared/trip/types';

/** 旅行プラン一覧APIで利用する最小構成の型 */
export type TripListItem = Pick<TripType, 'title' | 'imageUrl' | 'startDate' | 'endDate'> & {
  id: number;
};
