import { getPrefectures } from '@/lib/algorithm';
import { describe, it, expect } from 'vitest';

// Google Maps APIのAddressComponentのモック型
type MockAddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

/**
 * AddressComponentのモックデータを作成するヘルパー関数
 */
const createMockAddressComponents = (prefecture: string): MockAddressComponent[] => [
  {
    longText: prefecture,
    shortText: prefecture,
    types: ['administrative_area_level_1', 'political'],
  },
  {
    longText: '日本',
    shortText: 'JP',
    types: ['country', 'political'],
  },
];

describe('住所処理ユーティリティ', () => {
  describe('getPrefectures', () => {
    it('Google Maps APIのAddressComponentから東京都を抽出できる', () => {
      const addressComponents = createMockAddressComponents('東京都') as google.maps.places.AddressComponent[];
      expect(getPrefectures(addressComponents)).toBe('東京都');
    });

    it('Google Maps APIのAddressComponentから大阪府を抽出できる', () => {
      const addressComponents = createMockAddressComponents('大阪府') as google.maps.places.AddressComponent[];
      expect(getPrefectures(addressComponents)).toBe('大阪府');
    });

    it('Google Maps APIのAddressComponentから北海道を抽出できる', () => {
      const addressComponents = createMockAddressComponents('北海道') as google.maps.places.AddressComponent[];
      expect(getPrefectures(addressComponents)).toBe('北海道');
    });

    it('複数のAddressComponentから正しく都道府県を抽出できる', () => {
      const addressComponents = [
        {
          longText: '1-1',
          shortText: '1-1',
          types: ['premise'],
        },
        {
          longText: '渋谷',
          shortText: '渋谷',
          types: ['sublocality_level_1', 'sublocality', 'political'],
        },
        {
          longText: '渋谷区',
          shortText: '渋谷区',
          types: ['locality', 'political'],
        },
        {
          longText: '東京都',
          shortText: '東京都',
          types: ['administrative_area_level_1', 'political'],
        },
        {
          longText: '日本',
          shortText: 'JP',
          types: ['country', 'political'],
        },
      ] as google.maps.places.AddressComponent[];

      expect(getPrefectures(addressComponents)).toBe('東京都');
    });

    it('県が含まれる都道府県を正しく抽出できる', () => {
      const testCases = [
        { prefecture: '神奈川県' },
        { prefecture: '愛知県' },
        { prefecture: '福岡県' },
        { prefecture: '沖縄県' },
      ];

      testCases.forEach(({ prefecture }) => {
        const addressComponents = createMockAddressComponents(prefecture) as google.maps.places.AddressComponent[];
        expect(getPrefectures(addressComponents)).toBe(prefecture);
      });
    });

    it('administrative_area_level_1タイプがない場合はnullを返す', () => {
      const addressComponents = [
        {
          longText: '渋谷区',
          shortText: '渋谷区',
          types: ['locality', 'political'],
        },
        {
          longText: '日本',
          shortText: 'JP',
          types: ['country', 'political'],
        },
      ] as google.maps.places.AddressComponent[];

      expect(getPrefectures(addressComponents)).toBeNull();
    });

    it('空配列の場合はnullを返す', () => {
      expect(getPrefectures([])).toBeNull();
    });

    it('undefinedの場合はnullを返す', () => {
      expect(getPrefectures(undefined)).toBeNull();
    });

    it('longTextが存在しない場合はnullを返す', () => {
      const addressComponents = [
        {
          shortText: '東京都',
          types: ['administrative_area_level_1', 'political'],
        },
      ] as google.maps.places.AddressComponent[];

      expect(getPrefectures(addressComponents)).toBeNull();
    });

    it('実際のGoogle Maps APIレスポンスに近い形式で都道府県を抽出できる', () => {
      // 実際のAPIレスポンスを模倣した完全なデータ構造
      const addressComponents = [
        {
          longText: '1-chōme-1',
          shortText: '1-chōme-1',
          types: ['premise'],
        },
        {
          longText: '1',
          shortText: '1',
          types: ['political', 'sublocality', 'sublocality_level_4'],
        },
        {
          longText: '渋谷',
          shortText: '渋谷',
          types: ['political', 'sublocality', 'sublocality_level_2'],
        },
        {
          longText: '渋谷区',
          shortText: '渋谷区',
          types: ['locality', 'political'],
        },
        {
          longText: '東京都',
          shortText: '東京都',
          types: ['administrative_area_level_1', 'political'],
        },
        {
          longText: '日本',
          shortText: 'JP',
          types: ['country', 'political'],
        },
        {
          longText: '150-0002',
          shortText: '150-0002',
          types: ['postal_code'],
        },
      ] as google.maps.places.AddressComponent[];

      expect(getPrefectures(addressComponents)).toBe('東京都');
    });
  });
});
