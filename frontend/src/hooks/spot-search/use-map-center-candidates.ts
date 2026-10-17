import { useMemo } from 'react';

import { useStoreForPlanning } from '@/lib/plan';
import { filterActualSpots } from '@/lib/utils';
import { defaultLocation } from '@/data/constants';
import { ExtendPlanLocationType, MapCenterCandidate } from '@/types/plan';

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** 訪問順の番号（①〜⑩。11 以降は数字） */
export const toVisitNumberLabel = (index: number) => CIRCLED_NUMBERS[index] ?? `${index + 1}.`;

const formatMonthDay = (date: string) => {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
};

const toLocationCandidate = (
  kind: 'departure' | 'destination',
  location: ExtendPlanLocationType | undefined,
): MapCenterCandidate | null => {
  // 未設定の出発地・目的地は名前が空、または座標が 0 のまま
  if (!location?.name || !location.latitude || !location.longitude) return null;
  const prefix = kind === 'departure' ? '出発地' : '目的地';
  return {
    id: kind,
    kind,
    label: `${location.name} (${prefix})`,
    name: location.name,
    lat: location.latitude,
    lng: location.longitude,
  };
};

const DEFAULT_CANDIDATE: MapCenterCandidate = {
  id: defaultLocation.id,
  kind: 'default',
  label: defaultLocation.name,
  name: defaultLocation.name,
  lat: defaultLocation.lat,
  lng: defaultLocation.lng,
};

/**
 * プランから地図で探すの中心の候補を作り、初期中心を決める（No.341）
 * 候補の順: 出発地 → 目的地 → その日のスポット（訪問順） → 他の日のスポット（日付順）
 * 初期中心: 目的地 → 出発地 → 東京駅
 */
export function useMapCenterCandidates(date: string) {
  const { plans } = useStoreForPlanning();

  return useMemo(() => {
    const plan = plans.find((p) => p.date === date);
    const departure = toLocationCandidate('departure', plan?.departure);
    const destination = toLocationCandidate('destination', plan?.destination);

    const daySpots: MapCenterCandidate[] = filterActualSpots(plan?.spots ?? []).map((spot, index) => ({
      id: spot.id,
      kind: 'spot',
      label: `${toVisitNumberLabel(index)} ${spot.name}`,
      name: spot.name,
      lat: spot.latitude,
      lng: spot.longitude,
    }));

    const otherDaySpots: MapCenterCandidate[] = plans
      .filter((p) => p.date !== date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((p) =>
        filterActualSpots(p.spots).map((spot) => ({
          id: `${p.date}-${spot.id}`,
          kind: 'other-day-spot' as const,
          label: `${formatMonthDay(p.date)} ${spot.name}`,
          name: spot.name,
          lat: spot.latitude,
          lng: spot.longitude,
        })),
      );

    const candidates = [
      ...(departure ? [departure] : []),
      ...(destination ? [destination] : []),
      ...daySpots,
      ...otherDaySpots,
    ];

    return {
      candidates,
      initialCenter: destination ?? departure ?? DEFAULT_CANDIDATE,
    };
  }, [plans, date]);
}
