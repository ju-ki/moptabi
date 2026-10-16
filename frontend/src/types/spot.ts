import { OpeningHoursType } from '@shared/spot/types';

/** Google Places の営業時間の区切り（day: 0=日〜6=土） */
export type OpeningPoint = {
  day: number;
  hour: number;
  minute: number;
};

/**
 * Google Places の営業時間の 1 区間
 * close がない区間は、区間が 1 件だけなら 24 時間営業、複数ある中に混ざる場合は open の曜日の 24:00 までの営業を表す
 */
export type OpeningPeriod = {
  open: OpeningPoint;
  close?: OpeningPoint;
};

/** Google Places の営業状況 */
export type BusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

/** 営業時間の判定に使う値（表示用の営業時間とは別に、判定のためだけに持つ） */
export type OpeningInfo = {
  openingPeriods?: OpeningPeriod[];
  businessStatus?: BusinessStatus;
};

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
} & OpeningInfo;
