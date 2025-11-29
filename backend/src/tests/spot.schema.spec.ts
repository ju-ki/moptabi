import { describe, expect, it } from 'vitest';
import { SpotMetaSchema } from '@/models/spot';

describe('スポット情報のスキーマ検証', () => {
  describe('SpotMetaSchema（営業時間を含む）', () => {
    it('営業時間を含む正常なスポットメタデータを受け入れる', () => {
      const validSpotMeta = {
        id: 'meta_001',
        spotId: 'spot_001',
        name: '素敵なカフェ',
        latitude: 35.6895,
        longitude: 139.6917,
        image: 'https://example.com/cafe.jpg',
        rating: 4.5,
        categories: ['cafe', 'restaurant'],
        catchphrase: '落ち着いた雰囲気',
        description: '静かでゆったりできるカフェです',
        openingHours: [
          {
            day: '月',
            hours: '9:00-18:00',
          },
          {
            day: '火',
            hours: '9:00-18:00',
          },
          {
            day: '水',
            hours: '定休日',
          },
          {
            day: '木',
            hours: '9:00-18:00',
          },
          {
            day: '金',
            hours: '9:00-20:00',
          },
          {
            day: '土',
            hours: '10:00-20:00',
          },
          {
            day: '日',
            hours: '10:00-17:00',
          },
        ],
      };

      const result = SpotMetaSchema.safeParse(validSpotMeta);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openingHours).toBeDefined();
      }
    });

    it('営業時間がGoogle Mapから取得できなかった場合も受け入れる', () => {
      const spotMetaWithNullHours = {
        id: 'meta_002',
        spotId: 'spot_002',
        name: '公園',
        latitude: 35.6895,
        longitude: 139.6917,
        rating: 4.0,
        openingHours: [
          {
            day: '不明',
            hours: '営業時間なし',
          },
        ],
      };

      const result = SpotMetaSchema.safeParse(spotMetaWithNullHours);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openingHours).toBeDefined();
      }
    });

    it('24時間営業の場合も受け入れる', () => {
      const spotMetaWithoutHours = {
        id: 'meta_003',
        spotId: 'spot_003',
        name: '博物館',
        latitude: 35.6895,
        longitude: 139.6917,
        rating: 4.2,
        openingHours: [
          {
            day: '全',
            hours: '24時間営業',
          },
        ],
      };

      const result = SpotMetaSchema.safeParse(spotMetaWithoutHours);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openingHours).toBeDefined();
      }
    });
  });
});
