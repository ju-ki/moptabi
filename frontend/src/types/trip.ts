import z from 'zod';

import { TripSchema } from '@/models/trip';
import { Transport, TripInfo } from '@/types/plan';
import { DepartureAndDestinationType } from '@/models/planLocation';

export type TripType = z.infer<typeof TripSchema>;

/** バックエンドから取得するTrip詳細のAPIレスポンス型（placeIdのみ含む） */
export type TripDetailAPISpot = {
  id: string; // placeId
  stayStart: string;
  stayEnd: string;
  memo?: string;
  order: number;
  transports: Transport;
  nearestStation?: {
    name: string;
    walkingTime: number;
    latitude: number;
    longitude: number;
  } | null;
};

export type TripDetailAPIType = {
  title: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  tripInfo: TripInfo[];
  plans: Array<{
    date: string;
    spots: TripDetailAPISpot[];
    departure: DepartureAndDestinationType;
    destination: DepartureAndDestinationType;
  }>;
};
