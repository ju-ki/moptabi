import { describe, it, expect } from 'vitest';

import { buildSpotId, isDepartureOrDestination, filterActualSpots, getActualSpotCount } from '@/lib/utils';

describe('出発地・目的地の判定と除外機能', () => {
  describe('buildSpotId', () => {
    it('出発地のIDを正しく生成する', () => {
      const id = buildSpotId('departure', '2025-01-01');
      expect(id).toBe('departure_2025-01-01');
    });

    it('目的地のIDを正しく生成する', () => {
      const id = buildSpotId('destination', '2025-01-01');
      expect(id).toBe('destination_2025-01-01');
    });
  });

  describe('isDepartureOrDestination', () => {
    it('出発地のIDの場合はtrueを返す', () => {
      expect(isDepartureOrDestination('departure_2025-01-01')).toBe(true);
    });

    it('目的地のIDの場合はtrueを返す', () => {
      expect(isDepartureOrDestination('destination_2025-01-01')).toBe(true);
    });

    it('通常のスポットIDの場合はfalseを返す', () => {
      expect(isDepartureOrDestination('ChIJ12345abcdef')).toBe(false);
    });

    it('departureで始まるが正しい形式でない場合はfalseを返す', () => {
      expect(isDepartureOrDestination('departure')).toBe(false);
      expect(isDepartureOrDestination('departurePoint')).toBe(false);
    });

    it('destinationで始まるが正しい形式でない場合はfalseを返す', () => {
      expect(isDepartureOrDestination('destination')).toBe(false);
      expect(isDepartureOrDestination('destinationPoint')).toBe(false);
    });

    it('空文字の場合はfalseを返す', () => {
      expect(isDepartureOrDestination('')).toBe(false);
    });
  });

  describe('filterActualSpots', () => {
    const mockSpots = [
      { id: 'departure_2025-01-01', location: { name: '東京駅', lat: 35.0, lng: 139.0 } },
      { id: 'ChIJ123', location: { name: '観光スポット1', lat: 35.1, lng: 139.1 } },
      { id: 'ChIJ456', location: { name: '観光スポット2', lat: 35.2, lng: 139.2 } },
      { id: 'destination_2025-01-01', location: { name: '横浜駅', lat: 35.3, lng: 139.3 } },
    ];

    it('出発地と目的地を除外したスポット配列を返す', () => {
      const result = filterActualSpots(mockSpots);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('ChIJ123');
      expect(result[1].id).toBe('ChIJ456');
    });

    it('空配列の場合は空配列を返す', () => {
      const result = filterActualSpots([]);
      expect(result).toHaveLength(0);
    });

    it('出発地・目的地のみの場合は空配列を返す', () => {
      const onlyDepartureDestination = [
        { id: 'departure_2025-01-01', location: { name: '東京駅', lat: 35.0, lng: 139.0 } },
        { id: 'destination_2025-01-01', location: { name: '横浜駅', lat: 35.3, lng: 139.3 } },
      ];
      const result = filterActualSpots(onlyDepartureDestination);
      expect(result).toHaveLength(0);
    });

    it('通常スポットのみの場合はそのまま返す', () => {
      const onlySpots = [
        { id: 'ChIJ123', location: { name: '観光スポット1', lat: 35.1, lng: 139.1 } },
        { id: 'ChIJ456', location: { name: '観光スポット2', lat: 35.2, lng: 139.2 } },
      ];
      const result = filterActualSpots(onlySpots);
      expect(result).toHaveLength(2);
    });
  });

  describe('getActualSpotCount', () => {
    const mockSpots = [
      { id: 'departure_2025-01-01', location: { name: '東京駅', lat: 35.0, lng: 139.0 } },
      { id: 'ChIJ123', location: { name: '観光スポット1', lat: 35.1, lng: 139.1 } },
      { id: 'ChIJ456', location: { name: '観光スポット2', lat: 35.2, lng: 139.2 } },
      { id: 'ChIJ789', location: { name: '観光スポット3', lat: 35.3, lng: 139.3 } },
      { id: 'destination_2025-01-01', location: { name: '横浜駅', lat: 35.4, lng: 139.4 } },
    ];

    it('出発地と目的地を除外したスポット数を返す', () => {
      const count = getActualSpotCount(mockSpots);
      expect(count).toBe(3);
    });

    it('空配列の場合は0を返す', () => {
      const count = getActualSpotCount([]);
      expect(count).toBe(0);
    });

    it('出発地・目的地のみの場合は0を返す', () => {
      const onlyDepartureDestination = [
        { id: 'departure_2025-01-01', location: { name: '東京駅', lat: 35.0, lng: 139.0 } },
        { id: 'destination_2025-01-01', location: { name: '横浜駅', lat: 35.3, lng: 139.3 } },
      ];
      const count = getActualSpotCount(onlyDepartureDestination);
      expect(count).toBe(0);
    });

    it('undefinedの場合は0を返す', () => {
      const count = getActualSpotCount(undefined);
      expect(count).toBe(0);
    });
  });
});
