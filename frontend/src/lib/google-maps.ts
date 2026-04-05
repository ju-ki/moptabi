import { defaultLocation } from '@/data/constants';
import { OpeningHoursType } from '@/types/plan';
import { SpotMetaType } from '@/types/spot';

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
