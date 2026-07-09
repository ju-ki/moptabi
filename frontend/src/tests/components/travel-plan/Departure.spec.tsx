import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Departure from '@/components/Departure';

/**
 * Departure テスト
 * 出発地選択コンポーネントの表示内容を検証する
 */

// Google Maps はjsdom環境で動作しないためモック化する
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: any) => <div data-testid="google-map">{children}</div>,
  Marker: ({ position }: any) => (
    <div data-testid={`marker-${position.lat}-${position.lng}`} role="button" aria-label="map-marker" />
  ),
}));

// Mock useStoreForPlanning
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

// AddressSearchとSpotLocationSelectorをモック化
vi.mock('@/components/AddressSearch', () => ({
  default: () => <div data-testid="address-search">AddressSearch</div>,
}));

vi.mock('@/components/SpotLocationSelector', () => ({
  default: () => <div data-testid="spot-location-selector">SpotLocationSelector</div>,
}));

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';

// DepartureAndDestinationTypeのデフォルト値（コンポーネントが常にname等にアクセスするため）
const defaultDepartureData = {
  name: '',
  latitude: 35.6813,
  longitude: 139.7671,
  label: null,
  locationType: 'SPOT' as const,
  isDefault: false,
  usageCount: 0,
  userLocationId: null,
  planName: null,
  planLocationId: null,
};

const createMockFields = (overrides: any = {}) => ({
  departureList: [],
  getDepartureAndDestination: vi.fn().mockReturnValue(defaultDepartureData),
  plans: [{ date: '2025-12-20', spots: [] }],
  planErrors: {},
  setDepartureAndDestination: vi.fn(),
  ...overrides,
});

describe('Departure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('「出発地」ラベルが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      render(<Departure date="2025-12-20" />);

      expect(screen.getByText('出発地')).toBeInTheDocument();
    });

    it('説明テキストが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      render(<Departure date="2025-12-20" />);

      expect(screen.getByText(/未選択の場合は地図で選択されている場所が選択されます/)).toBeInTheDocument();
    });

    it('出発地選択ボタンが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      render(<Departure date="2025-12-20" />);

      // Popoverトリガーボタンの存在を確認
      const button = document.getElementById('departure-select-box');
      expect(button).toBeInTheDocument();
    });
  });

  describe('出発地が選択されている場合', () => {
    it('選択された出発地名が表示されること', () => {
      const mockDeparture = {
        name: '東京駅',
        latitude: 35.6812,
        longitude: 139.7671,
        userLocationId: 1,
        planLocationId: null,
      };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getDepartureAndDestination: vi.fn().mockReturnValue(mockDeparture),
        }),
      );

      render(<Departure date="2025-12-20" />);

      expect(screen.getByText('東京駅')).toBeInTheDocument();
    });

    it('userLocationIdもplanLocationIdもない場合は「候補以外の地点を選択中」と表示されること', () => {
      const mockDeparture = {
        name: '地図上の地点',
        latitude: 35.6812,
        longitude: 139.7671,
        userLocationId: null,
        planLocationId: null,
      };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getDepartureAndDestination: vi.fn().mockReturnValue(mockDeparture),
        }),
      );

      render(<Departure date="2025-12-20" />);

      expect(screen.getByText('候補以外の地点を選択中')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('planErrorsにdepartureエラーがある場合、エラーメッセージが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          planErrors: {
            '2025-12-20': { departure: '出発地を入力してください' },
          },
        }),
      );

      render(<Departure date="2025-12-20" />);

      expect(screen.getByText('出発地を入力してください')).toBeInTheDocument();
    });
  });
});
