import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Destination from '@/components/Destination';

/**
 * Destination テスト
 * 目的地選択コンポーネントの表示内容を検証する
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

// DepartureAndDestinationTypeのデフォルト値（コンポーネントが常にname等にアクセスするため）
const defaultDestinationData = {
  name: '',
  latitude: 35.6813,
  longitude: 139.7671,
  address: null,
  label: null,
  locationType: 'SPOT' as const,
  isDefault: false,
  usageCount: 0,
  userLocationId: null,
  planName: null,
  planLocationId: null,
};

const createMockFields = (overrides: any = {}) => ({
  destinationList: [],
  getDepartureAndDestination: vi.fn().mockReturnValue(defaultDestinationData),
  plans: [{ date: '2025-12-20', spots: [] }],
  planErrors: {},
  setDepartureAndDestination: vi.fn(),
  ...overrides,
});

describe('Destination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('「目的地」ラベルが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      render(<Destination date="2025-12-20" />);

      expect(screen.getByText('目的地')).toBeInTheDocument();
    });

    it('説明テキストが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      render(<Destination date="2025-12-20" />);

      expect(screen.getByText(/未選択の場合は地図で選択されている場所が選択されます/)).toBeInTheDocument();
    });

    it('目的地選択ボタンが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());

      render(<Destination date="2025-12-20" />);

      const button = document.getElementById('destination-select-box');
      expect(button).toBeInTheDocument();
    });
  });

  describe('目的地が選択されている場合', () => {
    it('選択された目的地名が表示されること', () => {
      const mockDestination = {
        name: '羽田空港',
        latitude: 35.5497,
        longitude: 139.7798,
        userLocationId: 1,
        planLocationId: null,
      };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getDepartureAndDestination: vi.fn().mockReturnValue(mockDestination),
        }),
      );

      render(<Destination date="2025-12-20" />);

      expect(screen.getByText('羽田空港')).toBeInTheDocument();
    });

    it('userLocationIdもplanLocationIdもない場合は「候補以外の地点を選択中」と表示されること', () => {
      const mockDestination = {
        name: '地図上の地点',
        latitude: 35.6812,
        longitude: 139.7671,
        userLocationId: null,
        planLocationId: null,
      };

      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          getDepartureAndDestination: vi.fn().mockReturnValue(mockDestination),
        }),
      );

      render(<Destination date="2025-12-20" />);

      expect(screen.getByText('候補以外の地点を選択中')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('planErrorsにdestinationエラーがある場合、エラーメッセージが表示されること', () => {
      (useStoreForPlanning as any).mockReturnValue(
        createMockFields({
          planErrors: {
            '2025-12-20': { destination: '目的地を入力してください' },
          },
        }),
      );

      render(<Destination date="2025-12-20" />);

      expect(screen.getByText('目的地を入力してください')).toBeInTheDocument();
    });
  });
});
