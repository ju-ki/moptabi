import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

import { useStoreForPlanning } from '@/lib/plan';
import Departure from '@/components/Departure';
import { PlanLocationCandidatesResponse } from '@/models/planLocation';
import { ExtendPlanLocationType, ExtendSpotType, TransportNodeType } from '@/types/plan';

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

vi.mock('@/hooks/use-geocoding', () => ({
  useGeocoding: () => ({
    searchByAddress: vi.fn().mockResolvedValue({
      latitude: 35.6812,
      longitude: 139.7671,
      formattedAddress: '東京都渋谷区渋谷1-1-1',
    }),
    isLoading: false,
    error: null,
  }),
}));

// Mock useStoreForPlanning
vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

// AddressSearchはonCoordinateFoundコールバックをシミュレートする
vi.mock('@/components/AddressSearch', () => ({
  default: ({ onCoordinateFound }: any) => (
    <div data-testid="address-search">
      <input
        data-testid="address-search-input"
        placeholder="住所を入力"
        onBlur={(e) => {
          // blurイベント時に住所検索結果をシミュレート
          if (e.target.value.trim()) {
            onCoordinateFound({
              id: `address-search-${Date.now()}`,
              name: '東京都渋谷区渋谷1-1-1',
              lat: 35.6812,
              lng: 139.7671,
            });
          }
        }}
      />
      <button
        data-testid="address-search-button"
        onClick={() => {
          const input = document.querySelector('[data-testid="address-search-input"]') as HTMLInputElement;
          if (input?.value.trim()) {
            onCoordinateFound({
              id: `address-search-${Date.now()}`,
              name: '東京都渋谷区渋谷1-1-1',
              lat: 35.6812,
              lng: 139.7671,
            });
          }
        }}
      >
        検索
      </button>
    </div>
  ),
}));

vi.mock('@/components/SpotLocationSelector', () => ({
  default: ({ onSelect }: any) => (
    <div data-testid="spot-location-selector">
      <div
        onClick={() =>
          onSelect({
            id: 'test1',
            name: '観光スポットテスト',
            latitude: 35.6812,
            longitude: 139.7671,
          })
        }
      >
        観光スポットテスト
      </div>
    </div>
  ),
}));

// DepartureAndDestinationTypeのデフォルト値（コンポーネントが常にname等にアクセスするため）
const defaultDepartureData: ExtendPlanLocationType = {
  name: '',
  latitude: 35.6813,
  longitude: 139.7671,
  locationType: 'DEPARTURE' as const,
  time: '09:00',
  travelTime: 0,
  transportMethod: 'DEFAULT',
  transportMethodId: 0,
  alternateRoutes: [],
};

const departureList: PlanLocationCandidatesResponse = {
  favorites: [
    {
      planId: null,
      locationType: 'DEPARTURE' as const,
      isDefault: false,
      label: 'common label',
      latitude: 35.6812,
      longitude: 139.7671,
      userLocationId: 1,
      planLocationId: null,
      usageCount: 3,
      name: '共通テスト',
      planName: '共通プランテスト',
    },
  ],
  history: [
    {
      planId: 1,
      locationType: 'DEPARTURE' as const,
      isDefault: false,
      label: '',
      latitude: 35.6812,
      longitude: 139.7671,
      userLocationId: null,
      planLocationId: 1,
      usageCount: 0,
      name: '出発地テスト',
      planName: '出発地プランテスト',
    },
  ],
};

const destinationList: PlanLocationCandidatesResponse = {
  favorites: [
    {
      planId: null,
      locationType: 'DESTINATION' as const,
      isDefault: false,
      label: 'common label',
      latitude: 35.6812,
      longitude: 139.7671,
      userLocationId: 1,
      planLocationId: null,
      usageCount: 3,
      name: '共通テスト',
      planName: '共通プランテスト',
    },
  ],
  history: [
    {
      planId: 1,
      locationType: 'DESTINATION' as const,
      isDefault: false,
      label: '',
      latitude: 35.6812,
      longitude: 139.7671,
      userLocationId: null,
      planLocationId: 1,
      usageCount: 0,
      name: '目的地テスト',
      planName: '目的地プランテスト',
    },
  ],
};

const spotList: ExtendSpotType[] = [
  {
    id: 'test1',
    name: '観光スポットテスト',
    latitude: 35.6812,
    longitude: 139.7671,
    order: 1,
    transportMethod: 'DEFAULT',
    transportMethodId: 0,
    alternateRoutes: [],
    rating: 5,
    stayStart: '09:00',
    stayEnd: '10:00',
    stayDuration: 60,
    travelTime: 0,
    spotId: 'test1',
  },
];
const createMockFields = (overrides: any = {}) => ({
  departureList: departureList,
  destinationList: destinationList,
  getDepartureAndDestination: vi.fn().mockReturnValue(defaultDepartureData),
  plans: [
    {
      date: '2025-12-20',
      spots: spotList,
    },
  ],
  planErrors: {},
  setDepartureAndDestination: vi.fn(),
  ...overrides,
});

describe('Departure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('出発時間に関する項目が表示されること', async () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());
      const user = userEvent.setup();
      render(<Departure date="2025-12-20" />);

      // 出発地と目的地の時間設定は関係なしに表示されていることを確認
      expect(screen.getAllByLabelText('time-setting')).toHaveLength(2); // 出発地と目的地の時間表示が2つあることを確認

      // 出発地の候補リストが表示されていること
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeInTheDocument();

      // 上記を押下することで候補のリストが表示されることを確認
      await user.click(selectElement);

      // favoriteの候補が表示されていることを確認
      expect(screen.getByText('共通テスト')).toBeInTheDocument();
      // 出発地のhistoryの候補が表示されていることを確認
      expect(screen.getByText('出発地テスト')).toBeInTheDocument();
      // 目的地のhistoryの候補が表示されていないことを確認
      expect(screen.queryByText('目的地テスト')).not.toBeInTheDocument();

      // それ以外の検索項目も表示されている
      expect(screen.getByTestId('address-search')).toBeInTheDocument();
      expect(screen.getByTestId('spot-location-selector')).toBeInTheDocument();
    });
    it('目的に関する項目が表示されること', async () => {
      (useStoreForPlanning as any).mockReturnValue(createMockFields());
      const user = userEvent.setup();

      render(<Departure date="2025-12-20" />);
      // 目的地タブに切り替える
      await user.click(screen.getByRole('tab', { name: '目的地' }));

      // 出発地の候補リストが表示されていること
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeInTheDocument();

      // 上記を押下することで候補のリストが表示されることを確認
      await user.click(selectElement);

      // favoriteの候補が表示されていることを確認
      expect(screen.getByText('共通テスト')).toBeInTheDocument();
      // 出発地のhistoryの候補が表示されていないことを確認
      expect(screen.queryByText('出発地テスト')).not.toBeInTheDocument();
      // 目的地のhistoryの候補が表示されていることを確認
      expect(screen.getByText('目的地テスト')).toBeInTheDocument();

      // それ以外の検索項目も表示されている
      expect(screen.getByTestId('address-search')).toBeInTheDocument();
      expect(screen.getByTestId('spot-location-selector')).toBeInTheDocument();
    });
  });

  describe('地点選択イベント', () => {
    describe('出発地', () => {
      it('お気に入りの候補を選択した際、出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);

        // 出発地のセレクトボックスを取得
        const selectElement = screen.getByRole('combobox');
        await user.click(selectElement);

        // お気に入りの候補を選択
        const favoriteCandidate = screen.getByText('共通テスト');
        await user.click(favoriteCandidate);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          'DEPARTURE',
          expect.objectContaining({
            name: '共通テスト',
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });

      it('historyの候補を選択した際、出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);

        // 出発地のセレクトボックスを取得
        const selectElement = screen.getByRole('combobox');
        await user.click(selectElement);

        // historyの候補を選択
        const historyCandidate = screen.getByText('出発地テスト');
        await user.click(historyCandidate);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          'DEPARTURE',
          expect.objectContaining({
            name: '出発地テスト',
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });
      it('住所検索をした際、出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);

        // 出発地の住所検索inputに値を入力
        const addressInput = screen.getByTestId('address-search-input') as HTMLInputElement;
        await user.type(addressInput, '東京都渋谷区渋谷1-1-1');

        // 入力欄からフォーカスを外す（blur発火）
        fireEvent.blur(addressInput);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          TransportNodeType.DEPARTURE,
          expect.objectContaining({
            latitude: 35.6812,
            longitude: 139.7671,
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });
      it('観光スポット周辺から出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);

        // 観光スポット周辺の候補を選択
        const spotSelectElement = screen.getByTestId('spot-location-selector');
        await user.click(spotSelectElement);
        const spotOption = screen.getByText('観光スポットテスト');
        await user.click(spotOption);
        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          'DEPARTURE',
          expect.objectContaining({
            name: '観光スポットテスト',
            latitude: 35.6812,
            longitude: 139.7671,
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });

      it('現在地のチェックボックスを押下後、出発地が更新されること', async () => {
        (navigator as any).geolocation = {
          getCurrentPosition: vi.fn().mockImplementation((success) =>
            success({
              coords: {
                latitude: 35.1234,
                longitude: 139.1234,
              },
            }),
          ),
        };
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);

        // 現在地のチェックボックスを取得してクリック
        const currentLocationCheckbox = screen.getByRole('checkbox', { name: /現在地/ });
        await user.click(currentLocationCheckbox);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          'DEPARTURE',
          expect.objectContaining({
            name: '',
            latitude: 35.1234,
            longitude: 139.1234,
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });
    });
    describe('目的地', () => {
      it('お気に入りの候補を選択した際、出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);
        // 目的地タブに切り替える
        await user.click(screen.getByRole('tab', { name: '目的地' }));

        // 出発地のセレクトボックスを取得
        const selectElement = screen.getByRole('combobox');
        await user.click(selectElement);

        // お気に入りの候補を選択
        const favoriteCandidate = screen.getByText('共通テスト');
        await user.click(favoriteCandidate);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          'DESTINATION',
          expect.objectContaining({
            name: '共通テスト',
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });

      it('historyの候補を選択した際、出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);
        // 目的地タブに切り替える
        await user.click(screen.getByRole('tab', { name: '目的地' }));

        // 出発地のセレクトボックスを取得
        const selectElement = screen.getByRole('combobox');
        await user.click(selectElement);

        // historyの候補を選択
        const historyCandidate = screen.getByText('目的地テスト');
        await user.click(historyCandidate);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          'DESTINATION',
          expect.objectContaining({
            name: '目的地テスト',
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });
      it('住所検索をした際、出発地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);
        // 目的地タブに切り替える
        await user.click(screen.getByRole('tab', { name: '目的地' }));

        // 出発地の住所検索inputに値を入力
        const addressInput = screen.getByTestId('address-search-input') as HTMLInputElement;
        await user.type(addressInput, '東京都渋谷区渋谷1-1-1');

        // 入力欄からフォーカスを外す（blur発火）
        fireEvent.blur(addressInput);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          TransportNodeType.DESTINATION,
          expect.objectContaining({
            latitude: 35.6812,
            longitude: 139.7671,
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });
      it('観光スポット周辺から目的地が更新されること', async () => {
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);
        // 目的地タブに切り替える
        await user.click(screen.getByRole('tab', { name: '目的地' }));

        // 観光スポット周辺の候補を選択
        const spotSelectElement = screen.getByTestId('spot-location-selector');
        await user.click(spotSelectElement);
        const spotOption = screen.getByText('観光スポットテスト');
        await user.click(spotOption);
        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          TransportNodeType.DESTINATION,
          expect.objectContaining({
            name: '観光スポットテスト',
            latitude: 35.6812,
            longitude: 139.7671,
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });

      it('現在地のチェックボックスを押下後、出発地が更新されること', async () => {
        (navigator as any).geolocation = {
          getCurrentPosition: vi.fn().mockImplementation((success) =>
            success({
              coords: {
                latitude: 35.1234,
                longitude: 139.1234,
              },
            }),
          ),
        };
        const user = userEvent.setup();
        (useStoreForPlanning as any).mockReturnValue(createMockFields());

        render(<Departure date="2025-12-20" />);
        // 目的地タブに切り替える
        await user.click(screen.getByRole('tab', { name: '目的地' }));

        // 現在地のチェックボックスを取得してクリック
        const currentLocationCheckbox = screen.getByRole('checkbox', { name: /現在地/ });
        await user.click(currentLocationCheckbox);

        // setDepartureAndDestinationが呼ばれていることを確認
        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledWith(
          '2025-12-20',
          TransportNodeType.DESTINATION,
          expect.objectContaining({
            name: '',
            latitude: 35.1234,
            longitude: 139.1234,
          }),
        );

        expect(useStoreForPlanning().setDepartureAndDestination).toHaveBeenCalledTimes(1);
      });
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

      expect(screen.getByText('出発地を選択')).toBeInTheDocument();
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
