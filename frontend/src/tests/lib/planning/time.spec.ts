import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning, timeToMinutes } from '@/lib/planning';
import { PLANNING_MESSAGE_SEGMENT } from '@/data/constants';

import {
  createBaseParams,
  PLANNING_MATRIX_CASES,
  createPlanningParamsFromMatrix,
  createTwoSpotParams,
  setupDeterministicRouteMock,
} from './fixtures';

describe('planning.ts: 時刻・滞在時間・余裕時間', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('余裕時間に応じた提案メッセージ', () => {
    it('[RED] 余裕時間が30分以上のとき滞在時間延長の提案を返す', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_SINGLE_WITHOUT_STATION_VALID',
          planningTypePattern: 'BOTH',
          transportPattern: 'SINGLE',
          nearestStationPattern: 'WITHOUT_STATION',
          candidatePattern: 'VALID',
        },
        30,
      );
      params.destination.time = '10:30';

      const result = await executePlanning(params);

      expect((result as unknown as { extraTimeMinutes?: number }).extraTimeMinutes).toBeGreaterThanOrEqual(30);
      expect(result.messages.some((message) => message.message.includes('お気に入りのスポット'))).toBe(true);
    });

    it('[RED] 余裕時間が60分以上のときゆとりある観光の提案を返す', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_MULTI_WITHOUT_STATION_VALID',
          planningTypePattern: 'BOTH',
          transportPattern: 'MULTI',
          nearestStationPattern: 'WITHOUT_STATION',
          candidatePattern: 'VALID',
        },
        30,
      );
      params.destination.time = '11:00';

      const result = await executePlanning(params);

      expect((result as unknown as { extraTimeMinutes?: number }).extraTimeMinutes).toBeGreaterThanOrEqual(60);
      expect(result.messages.some((message) => message.message.includes('各スポットで約'))).toBe(true);
    });

    it('[RED] 余裕時間60分以上の提案は「余力時間/スポット数」の分数で表示される', async () => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);
      params.destination.time = '12:40';
      params.transportMethodIds = [1];

      const result = await executePlanning(params);

      expect(result.extraTimeMinutes).toBeGreaterThanOrEqual(60);
      const expectedPerSpot = Math.floor((result.extraTimeMinutes ?? 0) / params.spots.length);
      expect(result.extraTimeMessage).toBe(`各スポットで約${expectedPerSpot}分ずつ長く滞在できます`);
    });

    it('[RED] 余裕時間が90分以上のときスポット追加提案を返す', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_MULTI_WITH_STATION_EMPTY',
          planningTypePattern: 'BOTH',
          transportPattern: 'MULTI',
          nearestStationPattern: 'WITH_STATION',
          candidatePattern: 'EMPTY',
        },
        30,
      );
      params.destination.time = '14:00';

      const result = await executePlanning(params);

      expect((result as unknown as { extraTimeMinutes?: number }).extraTimeMinutes).toBeGreaterThanOrEqual(90);
      expect(
        result.messages.some((message) =>
          message.message.includes('新しいスポットを追加して、より充実した旅程にしませんか'),
        ),
      ).toBe(true);
    });

    it('余裕時間提案は extraTimeMessage にも格納される', async () => {
      setupDeterministicRouteMock();
      const params = createPlanningParamsFromMatrix(
        {
          id: 'BOTH_MULTI_WITH_STATION_EMPTY',
          planningTypePattern: 'BOTH',
          transportPattern: 'MULTI',
          nearestStationPattern: 'WITH_STATION',
          candidatePattern: 'EMPTY',
        },
        30,
      );
      params.destination.time = '14:00';

      const result = await executePlanning(params);

      expect(result.extraTimeMinutes).toBeGreaterThanOrEqual(90);
      expect(result.extraTimeMessage).toBe('新しいスポットを追加して、より充実した旅程にしませんか');
    });
  });

  describe('滞在時間の補正', () => {
    it.each(PLANNING_MATRIX_CASES)('[RED][%s] 滞在時間が長いほど到着時刻は後ろ倒しになる', async (matrixCase) => {
      setupDeterministicRouteMock();
      const shortStayParams = createPlanningParamsFromMatrix(matrixCase, 30);
      const longStayParams = createPlanningParamsFromMatrix(matrixCase, 180);

      const shortResult = await executePlanning(shortStayParams);
      const longResult = await executePlanning(longStayParams);

      expect(timeToMinutes(longResult.arrivalTime)).toBeGreaterThan(timeToMinutes(shortResult.arrivalTime));
    });

    it('updatedSpots に滞在開始/終了時刻が反映される', async () => {
      setupDeterministicRouteMock();
      const params = createTwoSpotParams(30);

      const result = await executePlanning(params);

      expect(result.updatedSpots).toBeDefined();
      expect(result.updatedSpots).toHaveLength(2);
      expect(result.updatedSpots?.[0].stayStart).toMatch(/^\d{2}:\d{2}$/);
      expect(result.updatedSpots?.[0].stayEnd).toMatch(/^\d{2}:\d{2}$/);
      expect(result.updatedSpots?.[1].stayStart).toMatch(/^\d{2}:\d{2}$/);
      expect(result.updatedSpots?.[1].stayEnd).toMatch(/^\d{2}:\d{2}$/);
    });

    it('先行スポットの滞在時間が長いほど後続スポットの滞在時刻が後ろにスライドする', async () => {
      setupDeterministicRouteMock();
      const shortStayParams = createTwoSpotParams(30);
      const longStayParams = createTwoSpotParams(180);

      const shortResult = await executePlanning(shortStayParams);
      const longResult = await executePlanning(longStayParams);

      const shortSecondSpot = shortResult.updatedSpots?.find((spot) => spot.id === 'spot-2');
      const longSecondSpot = longResult.updatedSpots?.find((spot) => spot.id === 'spot-2');

      expect(shortSecondSpot).toBeDefined();
      expect(longSecondSpot).toBeDefined();

      expect(timeToMinutes(longSecondSpot!.stayStart)).toBeGreaterThanOrEqual(
        timeToMinutes(shortSecondSpot!.stayStart),
      );
      expect(timeToMinutes(longSecondSpot!.stayEnd)).toBeGreaterThanOrEqual(timeToMinutes(shortSecondSpot!.stayEnd));
    });

    it.each(PLANNING_MATRIX_CASES)(
      '[RED][%s] 到着時間超過時に必要な滞在時間短縮分をメッセージとして返す',
      async (matrixCase) => {
        setupDeterministicRouteMock();
        const params = createPlanningParamsFromMatrix(matrixCase, 240);
        params.destination.time = '09:30';

        const result = await executePlanning(params);

        expect(result.isOverTime).toBe(true);
        expect(
          result.messages.some(
            (message) =>
              message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME &&
              (message.message.includes('滞在時間を') ||
                message.message.includes('各スポットの滞在時間を減らすか他の移動手段を検討してみましょう') ||
                message.message.includes('スポットの見直しをしてみましょう。')),
          ),
        ).toBe(true);
      },
    );

    it('[RED] 到着時間超過が1-30分のときは小提案メッセージを返す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '10:25';

      const result = await executePlanning(params);
      const overTimeMessage = result.messages.find(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );

      expect(result.isOverTime).toBe(true);
      expect(result.overTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(result.overTimeMinutes).toBeLessThanOrEqual(30);
      expect(overTimeMessage?.message).toBe(`滞在時間を${result.overTimeMinutes}分減らしてみましょう。`);
    });

    it('[RED] 到着時間超過が31-60分のときは中提案メッセージを返す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '09:45';

      const result = await executePlanning(params);
      const overTimeMessage = result.messages.find(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );

      expect(result.isOverTime).toBe(true);
      expect(result.overTimeMinutes).toBeGreaterThanOrEqual(31);
      expect(result.overTimeMinutes).toBeLessThanOrEqual(60);
      expect(overTimeMessage?.message).toBe('各スポットの滞在時間を減らすか他の移動手段を検討してみましょう');
    });

    it('[RED] 到着時間超過が61分以上のときは大提案メッセージを返す', async () => {
      setupDeterministicRouteMock();
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '09:15';

      const result = await executePlanning(params);
      const overTimeMessage = result.messages.find(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );

      expect(result.isOverTime).toBe(true);
      expect(result.overTimeMinutes).toBeGreaterThanOrEqual(61);
      expect(overTimeMessage?.message).toBe('スポットの見直しをしてみましょう。');
    });

    it('[RED] 到着時間超過時は arrivalWarning を返し、超過しない場合は null', async () => {
      setupDeterministicRouteMock();

      const overParams = createBaseParams();
      overParams.transportMethodIds = [1];
      overParams.destination.time = '09:45';
      const overResult = await executePlanning(overParams);

      expect(overResult.isOverTime).toBe(true);
      expect(overResult.arrivalWarning).not.toBeNull();
      expect(overResult.arrivalWarning?.exceededMinutes).toBe(overResult.overTimeMinutes);

      const safeParams = createBaseParams();
      safeParams.transportMethodIds = [1];
      safeParams.destination.time = '12:00';
      const safeResult = await executePlanning(safeParams);

      expect(safeResult.isOverTime).toBe(false);
      expect(safeResult.arrivalWarning ?? null).toBeNull();
    });

    it.each(PLANNING_MATRIX_CASES)(
      '[RED][%s] 滞在時間補正後も各スポット滞在時間が負値にならない',
      async (matrixCase) => {
        setupDeterministicRouteMock();
        const params = createPlanningParamsFromMatrix(matrixCase, 1);

        const result = await executePlanning(params);

        const stayDurations = params.spots.map((spot) => spot.stayDuration ?? 0);
        expect(stayDurations.every((duration) => duration >= 0)).toBe(true);
        expect(result.routes.length).toBeGreaterThan(0);
      },
    );
  });
});
