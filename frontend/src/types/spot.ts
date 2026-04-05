import { OpeningHoursType } from './plan';

/** Google Maps から取得したスポットのメタ情報（表示用） */
export type SpotMetaType = {
  spotId: string;
  name: string;
  latitude: number;
  longitude: number;
  image?: string;
  url?: string;
  prefecture?: string;
  address?: string;
  rating?: number;
  categories?: string[];
  catchphrase?: string;
  description?: string;
  openingHours?: OpeningHoursType;
};
