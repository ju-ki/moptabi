import { defaultLocation } from '@/data/constants';
import { estimateWalkingTime, calculateDistance } from '@/data/mockNearestStation';
import { OpeningHoursType } from '@shared/spot/types';
import {  Coordination, ExtendNearestStationType } from '@/types/plan';
import { SpotMetaType } from '@/types/spot';
import { NearestStation } from '@/types/nearestStation';

const getDayName = (day: number): string => {
  const days = ['日', '月', '火', '水', '木', '金', '土', '全', '不明'];
  return days[day];
};

const formatTime = (hour: number, minute: number): string => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const formatOpeningHours = (periods: google.maps.places.OpeningHoursPeriod[] | null): OpeningHoursType => {
  const hoursByDay: Record<number, string[]> = {};
  if (!periods || periods.length === 0) {
    return [{ day: getDayName(8), hours: '営業時間情報なし' }];
  }

  if (periods.length === 1 && !periods[0].close) {
    return [{ day: getDayName(7), hours: '24時間営業' }];
  }

  periods.forEach((period) => {
    if (!period.open) {
      return;
    }
    const day = period.open.day;
    // Places API (New) では hours/minutes プロパティを使用
    const openTime = formatTime(period.open.hour, period.open.minute);
    const closeTime = period.close ? formatTime(period.close.hour, period.close.minute) : '24:00';

    if (!hoursByDay[day]) {
      hoursByDay[day] = [];
    }
    hoursByDay[day].push(`${openTime}-${closeTime}`);
  });

  const sortedDays = Object.keys(hoursByDay).sort((a, b) => Number(a) - Number(b));

  return sortedDays.map((day) => ({
    day: getDayName(Number(day)),
    hours: hoursByDay[Number(day)].join(', '),
  }));
};

/**
 * 住所コンポーネントから都道府県を抽出する
 */
export const getPrefectureFromComponents = (
  addressComponents: google.maps.places.AddressComponent[] | null | undefined,
): string => {
  if (!addressComponents) return '';
  const prefectureComponent = addressComponents.find(
    (c) => c.types.includes('administrative_area_level_1') || c.types.includes('locality'),
  );
  return prefectureComponent?.longText ?? '';
};

/**
 * Google Maps Place オブジェクトから SpotMetaType に変換する
 */
export const convertPlaceToSpotMeta = (place: google.maps.places.Place, placeId: string): SpotMetaType => ({
  spotId: placeId,
  name: place.displayName ?? '',
  latitude: place.location?.lat() ?? defaultLocation.lat,
  longitude: place.location?.lng() ?? defaultLocation.lng,
  image: '/scene.webp',
  url: place.websiteURI ?? '',
  rating: place.rating ?? 0,
  categories: place.types ?? [],
  address: place.formattedAddress ?? '',
  prefecture: getPrefectureFromComponents(place.addressComponents),
  catchphrase: '',
  description: place.editorialSummary ?? '',
  openingHours: formatOpeningHours(place.regularOpeningHours?.periods ?? null),
});

/** Place Details 取得時に使用するフィールド一覧 */
export const PLACE_DETAIL_FIELDS = [
  'displayName',
  'location',
  'rating',
  'types',
  'regularOpeningHours',
  'editorialSummary',
  'websiteURI',
  'userRatingCount',
  'formattedAddress',
  'addressComponents',
] as const;

/**
 * placeId を使って Google Maps Place Details を取得する
 */
export async function fetchPlaceById(placeId: string): Promise<google.maps.places.Place> {
  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
  const place = new Place({ id: placeId });
  await place.fetchFields({ fields: [...PLACE_DETAIL_FIELDS] });
  return place;
}

/** 最寄駅検索のリクエスト型 */
export type SearchNearestStationType = {
  center?: Coordination; // スポットの中心地
  radius: number; //半径（km）
  excludeBusStop?: boolean; // バス停を除外するかどうか
};

/**
 * Google Maps Places APIを使用して最寄駅を検索する
 */
export async function searchNearestStation(params: SearchNearestStationType): Promise<ExtendNearestStationType[]> {
  const { Place, SearchNearbyRankPreference } = (await google.maps.importLibrary(
    'places',
  )) as google.maps.PlacesLibrary;

  const placeToSpot = (place: google.maps.places.Place): ExtendNearestStationType => ({
    spotId: params.center?.id ?? '',
    placeId: place.id,
    stationType: place.primaryTypeDisplayName === 'バス停' ? 'BUS' : 'TRAIN',
    name: place.displayName || '',
    distance: calculateDistance(
      params.center?.lat ?? 0,
      params.center?.lng ?? 0,
      place.location?.lat() ?? 0,
      place.location?.lng() ?? 0,
    ),
    walkingTime: estimateWalkingTime(
      calculateDistance(
        params.center?.lat ?? 0,
        params.center?.lng ?? 0,
        place.location?.lat() ?? 0,
        place.location?.lng() ?? 0,
      ),
    ),
    transitTime: 0, // 初期値として0を設定。後で計算する場合は別途処理が必要。
    latitude: place.location?.lat() ?? 0,
    longitude: place.location?.lng() ?? 0,
  });

  const fields = [
    'displayName',
    'location',
    'businessStatus',
    'googleMapsURI',
    'rating',
    'types',
    'primaryType',
    'primaryTypeDisplayName',
    'attributions',
    'regularOpeningHours',
    'editorialSummary',
    'websiteURI',
    'priceLevel',
    'userRatingCount',
    'formattedAddress',
    'addressComponents',
  ];

  // centerがない場合は空配列を返す
  if (!params.center) {
    return [];
  }

  const center = new google.maps.LatLng(params.center.lat, params.center.lng);
  const request: google.maps.places.SearchNearbyRequest = {
    fields: fields,
    locationRestriction: {
      center: center,
      radius: params.radius * 1000, // 半径をメートルに変換
    },
    includedTypes: params.excludeBusStop ? ['train_station'] : ['train_station', 'transit_station'],
    maxResultCount: 5, // 最大取得件数
    rankPreference: SearchNearbyRankPreference.DISTANCE,
    language: 'ja',
    region: 'JP',
  };

  const { places } = await Place.searchNearby(request);

  return places?.map(placeToSpot) ?? [];
}
