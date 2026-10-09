import { beforeEach, describe, expect, it, vi } from 'vitest';

// getRoute は Google Maps API を呼ぶため、テストではモックする
vi.mock('@/lib/plan', () => ({
  getRoute: vi.fn(),
}));

import { executePlanning, getPlanningMessagePriority, pushLongWalkMessage, sortPlanningMessages } from '@/lib/planning';
import { PLANNING_MESSAGE_SEGMENT } from '@/data/constants';

import { mockGetRoute, createBaseParams, createRouteResult } from './fixtures';

describe('planning.ts: メッセージ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('メッセージ優先度', () => {
    it('[RED] 到着時間超過メッセージは徒歩長距離メッセージより先に並ぶ', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      params.destination.time = '09:20';

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 15, 2000));

      const result = await executePlanning(params);
      const overTimeIndex = result.messages.findIndex(
        (message) => message.segmentKey === PLANNING_MESSAGE_SEGMENT.OVER_TIME,
      );
      const longWalkIndex = result.messages.findIndex((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION),
      );

      expect(overTimeIndex).toBeGreaterThanOrEqual(0);
      expect(longWalkIndex).toBeGreaterThanOrEqual(0);
      expect(overTimeIndex).toBeLessThan(longWalkIndex);
    });

    it('優先順位0-8の全パターンでソートされる', () => {
      const sorted = sortPlanningMessages([
        {
          level: 'INFO',
          segmentKey: PLANNING_MESSAGE_SEGMENT.EXTRA_TIME,
          message: 'お気に入りのスポットでもう少しゆっくり過ごしてみては？',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_ADJUSTED}:SPOT_A_TO_B`,
          message:
            '入力した発車時間が最寄駅到着時間より前になるため、発車時間を調整しました。発車時間の見直しまたはスポットの見直しを行ってください。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.DEPARTURE_CANDIDATE_EMPTY}:SPOT_A_TO_B`,
          message: '発車時間が未入力のため、最寄駅到着の1分後に設定しました。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED}:SPOT_A_TO_B`,
          message: 'ルートが取得できませんでした。スポットの見直しをしてください。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.ROUTE_FALLBACK_WALKING}:SPOT_A_TO_B`,
          message: '車のルートが取得できませんでしたので徒歩のルートを取得しました。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION}:SPOT_A_TO_B`,
          message: '徒歩で0時間45分かかるため,最寄駅を推奨します',
        },
        {
          level: 'WARNING',
          segmentKey: PLANNING_MESSAGE_SEGMENT.OVER_TIME,
          message: 'スポットの見直しをしてみましょう。',
        },
        {
          level: 'WARNING',
          segmentKey: `${PLANNING_MESSAGE_SEGMENT.NEAREST_STATION_ONE_SIDE}:SPOT_A_TO_B`,
          message: 'スポットBの最寄駅が未設定のため、最寄駅を使わないルートで計算しました。',
        },
        {
          level: 'ERROR',
          segmentKey: PLANNING_MESSAGE_SEGMENT.DAY_OVERFLOW,
          message: '到着時刻が23:59を超えています。出発時間を早めるか、スポットや滞在時間を見直してください。',
        },
      ]);

      const priorities = sorted.map((message) => getPlanningMessagePriority(message));
      expect(priorities).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(sorted[0].level).toBe('ERROR');
    });
  });

  //  経路失敗・長距離徒歩メッセージ
  describe('経路失敗・長距離徒歩メッセージ', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('ルート取得失敗時はROUTE_FETCH_FAILEDメッセージが最優先で表示される', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [2, 3];
      mockGetRoute.mockImplementation(async () => {
        throw new Error('route failed');
      });

      const result = await executePlanning(params);
      expect(result.messages[0].segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED)).toBe(true);
      expect(getPlanningMessagePriority(result.messages[0])).toBe(2); // 2はROUTE_FETCH_FAILEDの優先度
    });

    it('徒歩長距離が発生した場合はLONG_WALK_RECOMMENDATIONメッセージが表示される', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];
      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 100, 2000));

      const result = await executePlanning(params);
      expect(
        result.messages.some((message) =>
          message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION),
        ),
      ).toBe(true);
    });

    it('ルート取得失敗と徒歩長距離が同時に発生した場合はROUTE_FETCH_FAILEDが優先', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];
      let routeCallCount = 0;
      mockGetRoute.mockImplementation(async (_from, _to, mode: string) => {
        routeCallCount += 1;
        // 1区間目(4回想定: WALKING/BICYCLING/DRIVING/fallback WALKING)は全失敗
        if (routeCallCount <= 4) throw new Error(`${mode} failed`);
        // 2区間目は徒歩のみ成功して長距離徒歩メッセージを発生させる
        if (mode === 'WALKING') return createRouteResult('WALKING', 100, 2000);
        throw new Error(`${mode} failed`);
      });

      const result = await executePlanning(params);
      const routeFailureMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.ROUTE_FETCH_FAILED),
      );
      const longWalkMessage = result.messages.find((message) =>
        message.segmentKey.startsWith(PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION),
      );

      expect(routeFailureMessage).toBeDefined();
      expect(longWalkMessage).toBeDefined();
      expect(getPlanningMessagePriority(routeFailureMessage!)).toBeLessThan(
        getPlanningMessagePriority(longWalkMessage!),
      );
    });
  });

  describe('ルート取得不可メッセージの生成', () => {
    it('[RED] ルート取得失敗時は設計書の失敗メッセージを返す', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1, 2, 3];

      mockGetRoute.mockImplementation(async (_from, _to, _mode: string) => {
        throw new Error('route failed');
      });

      const result = await executePlanning(params);

      expect(
        result.messages.some(
          (message) => message.message === 'ルートが取得できませんでした。スポットの見直しをしてください。',
        ),
      ).toBe(true);
    });

    it('徒歩長距離メッセージはhh時間mm分形式で返す', async () => {
      const params = createBaseParams();
      params.transportMethodIds = [1];

      mockGetRoute.mockResolvedValue(createRouteResult('WALKING', 100, 2000));

      const result = await executePlanning(params);
      const longWalk = result.messages.find((message) => message.message.includes('最寄駅を推奨します'));

      expect(longWalk).toBeDefined();
      expect(longWalk?.message).toContain('徒歩で1時間40分かかるため,最寄駅を推奨します');
    });
  });

  describe('長距離徒歩メッセージ', () => {
    it('距離が1.5km未満の場合はメッセージを追加しない', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      pushLongWalkMessage(messages, 'A_TO_B', 100, 1499, '起点名', '目的地');

      expect(messages).toHaveLength(0);
    });

    it('距離が1.5kmちょうどかつ徒歩の場合はhh時間mm分形式でメッセージを追加する', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      pushLongWalkMessage(messages, 'A_TO_B', 100, 1500, '起点名', '目的地');

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        level: 'WARNING',
        segmentKey: `${PLANNING_MESSAGE_SEGMENT.LONG_WALK_RECOMMENDATION}:A_TO_B`,
        message: '起点名から目的地は徒歩で1時間40分かかるため,最寄駅を推奨します',
      });
    });

    it('60分未満はhh時間を表示せずmm分のみを表示する', () => {
      const messages: Array<{ level: 'INFO' | 'WARNING'; segmentKey: string; message: string }> = [];

      pushLongWalkMessage(messages, 'A_TO_B', 59, 2000, '起点名', '目的地');

      expect(messages).toHaveLength(1);
      expect(messages[0].message).toBe('起点名から目的地は徒歩で59分かかるため,最寄駅を推奨します');
      expect(messages[0].message.includes('0時間')).toBe(false);
    });
  });
});
