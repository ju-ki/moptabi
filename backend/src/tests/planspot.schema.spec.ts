import { describe, expect, it } from 'vitest';

import { PlanSpotSchema } from '@/models/spot';

describe('プランに対するスポット情報のスキーマ検証', () => {
  describe('planSpotSchema', () => {
    const mockPlanSpot = {
      planId: 1,
      spotId: 'spot_001',
      stayStart: '10:00',
      stayEnd: '12:00',
      memo: 'ここでランチを食べる予定',
      order: 1,
    };

    it('正しいプランスポット情報がスキーマに一致する', () => {
      const result = PlanSpotSchema.safeParse(mockPlanSpot);
      expect(result.success).toBe(true);
  });
  });
});
