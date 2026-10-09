import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning, selectDepartureCandidate } from '@/lib/planning';
import { PLANNING_MESSAGE_SEGMENT } from '@/data/constants';

import { mockGetRoute, createBaseParams, createRouteResult } from './fixtures';

describe('planning.ts: 発車時間の候補選択', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('発車時間の候補選択ルール', () => {
    it('最寄駅到着+1分以降の候補がある場合は最も早い候補を採用する', () => {
      const selected = selectDepartureCandidate(630, ['10:20', '10:50', '11:00']);

      expect(selected.selectedTime).toBe('10:50');
      expect(selected.level).toBeUndefined();
      expect(selected.message).toBeUndefined();
    });

    it('発車時間候補が未入力なら最寄駅到着+1分を自動採用する', () => {
      const selected = selectDepartureCandidate(630, []);

      expect(selected.selectedTime).toBe('10:31');
      expect(selected.level).toBe('WARNING');
      expect(selected.message).toBe('発車時間が未入力のため、最寄駅到着の1分後に設定しました。');
    });

    it('候補がすべて最寄駅到着+1分より前なら最寄駅到着+1分へ補正する', () => {
      const selected = selectDepartureCandidate(630, ['09:50', '10:00', '10:30']);

      expect(selected.selectedTime).toBe('10:31');
      expect(selected.level).toBe('WARNING');
      expect(selected.message).toBe(
        '入力した発車時間が最寄駅到着時間より前になるため、発車時間を調整しました。発車時間の見直しまたはスポットの見直しを行ってください。',
      );
    });

    it('[RED] 有効な発車候補がある場合は区間メッセージを生成しない', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: ['09:20', '09:35', '09:50'],
        stationType: 'TRAIN',
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        transitTime: 10,
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);

      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY),
        ),
      ).toBe(false);
      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED),
        ),
      ).toBe(false);
    });

    it('[RED] 発車候補未入力時は固定segmentKey+区間キーでメッセージを生成する', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: [],
        stationType: 'TRAIN',
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
        scheduledDepartureTimes: [],
        transitTime: 10,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const candidateMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY),
      );

      expect(candidateMessage).toBeDefined();
      expect(candidateMessage?.segmentKey).toBe(
        `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY}:DEPARTURE_TO_FIRST_SPOT`,
      );
    });

    it('[RED] 発車候補が全て過去時は固定segmentKey+区間キーでメッセージを生成する', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.departure.nearestStation = {
        spotId: 'departure',
        placeId: 'dep-station',
        name: '東京駅',
        walkingTime: 10,
        latitude: 35.681236,
        longitude: 139.767125,
        transitTime: 10,
        scheduledDepartureTimes: ['08:00', '08:20', '08:40'],
        stationType: 'TRAIN',
      };
      params.spots[0].nearestStation = {
        placeId: 'spot-station',
        name: '新宿駅',
        stationType: 'TRAIN',
        transitTime: 10,
        walkingTime: 10,
        latitude: 35.6895,
        longitude: 139.7004,
      };

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 600));

      const result = await executePlanning(params);
      const candidateMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED),
      );

      expect(candidateMessage).toBeDefined();
      expect(candidateMessage?.segmentKey).toBe(
        `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED}:DEPARTURE_TO_FIRST_SPOT`,
      );
    });
  });
});
