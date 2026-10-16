import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MapSpotSearch from '@/components/spot-selection/MapSpotSearch';
import { useStoreForPlanning } from '@/lib/plan';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { ExtendPlanLocationType, ExtendSpotType, MapVisitedPin, Spot, TravelPlanType } from '@/types/plan';

/**
 * 地図で探す（No.341）を検証する
 */

type MockMapProps = {
  children?: React.ReactNode;
  onLoad?: (map: google.maps.Map) => void;
  onClick?: (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => void;
  onDragEnd?: () => void;
};

type MockMarkerProps = {
  label?: string | google.maps.MarkerLabel;
  title?: string;
  onClick?: () => void;
  opacity?: number;
};

const {
  mapProps,
  mapInstance,
  mockSearchByAddress,
  mockFetchPlaceDetails,
  mockUseWishlistSpots,
  mockUseMapVisitedPins,
} = vi.hoisted(() => ({
  mapProps: { current: {} as MockMapProps },
  mapInstance: {
    panTo: vi.fn(),
    setZoom: vi.fn(),
    getCenter: vi.fn(() => ({ lat: () => 35.01, lng: () => 135.77 })),
  },
  mockSearchByAddress: vi.fn(),
  mockFetchPlaceDetails: vi.fn(),
  mockUseWishlistSpots: vi.fn(),
  mockUseMapVisitedPins: vi.fn(),
}));

// 地図 SDK はテスト環境で実行できないため、props を取り出して操作できる部品に置き換える
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: (props: MockMapProps) => {
    mapProps.current = props;
    const { onLoad } = props;
    React.useEffect(() => {
      onLoad?.(mapInstance as unknown as google.maps.Map);
    }, [onLoad]);
    return <div data-testid="google-map">{props.children}</div>;
  },
  Marker: ({ label, title, onClick, opacity }: MockMarkerProps) => (
    <button
      type="button"
      data-testid="map-marker"
      data-label={typeof label === 'string' ? label : label?.text}
      data-opacity={opacity ?? 1}
      title={title}
      onClick={onClick}
    />
  ),
}));

// Geocoding API はテスト環境で呼べないため、結果を返すだけの関数に置き換える
vi.mock('@/hooks/use-geocoding', () => ({
  useGeocoding: () => ({ searchByAddress: mockSearchByAddress, isLoading: false, error: null }),
}));

// Places API はテスト環境で呼べないため、呼び出し回数を確認できる関数に置き換える
vi.mock('@/lib/place-fetcher', () => ({
  fetchPlaceDetailsWithRetry: mockFetchPlaceDetails,
}));

// 行きたいリスト・過去のスポットは API とセッションに依存するため、取得結果を差し替える（取得処理自体は各フックの spec で検証）
vi.mock('@/hooks/spot-search/use-wishlist-spots', () => ({
  useWishlistSpots: mockUseWishlistSpots,
}));
vi.mock('@/hooks/spot-search/use-map-visited-pins', () => ({
  useMapVisitedPins: mockUseMapVisitedPins,
}));

// 2026-10-17 は土曜日
const DATE = '2026-10-17';

const yasakaMeta = {
  spotId: 'poi-yasaka',
  name: '八坂神社',
  latitude: 35.0037,
  longitude: 135.7785,
  rating: 4.4,
  address: '京都市東山区祇園町北側625',
  openingPeriods: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    open: { day, hour: 9, minute: 0 },
    close: { day, hour: 17, minute: 0 },
  })),
};

/** Google 標準の POI を押したときのイベント */
const poiClickEvent = (placeId: string) =>
  ({ placeId, stop: vi.fn(), latLng: null }) as unknown as google.maps.IconMouseEvent;

const location = (name: string, lat: number, lng: number): ExtendPlanLocationType =>
  ({ name, latitude: lat, longitude: lng, time: '09:00', alternateRoutes: [] }) as unknown as ExtendPlanLocationType;

const createSpot = (overrides: Partial<ExtendSpotType> = {}): ExtendSpotType => ({
  id: 'kiyomizu',
  spotId: 'kiyomizu',
  name: '清水寺',
  latitude: 34.9949,
  longitude: 135.785,
  stayStart: '10:00',
  stayEnd: '11:00',
  stayDuration: 60,
  rating: 4.5,
  transportMethodId: 0,
  transportMethod: 'DEFAULT',
  travelTime: 0,
  order: 1,
  ...overrides,
});

const createPlan = (overrides: Partial<TravelPlanType> = {}): TravelPlanType => ({
  date: DATE,
  departure: location('京都駅', 34.9858, 135.7588),
  destination: location('京都タワー', 34.9875, 135.7593),
  spots: [
    createSpot(),
    createSpot({ id: 'inari', spotId: 'inari', name: '伏見稲荷大社', latitude: 34.9671, longitude: 135.7727 }),
  ],
  ...overrides,
});

const mockVisitedPins = { pins: [] as MapVisitedPin[], remainingCount: 0, loadMore: vi.fn(), isLoading: false };

const setDefaultLayerMocks = () => {
  mockUseWishlistSpots.mockReturnValue({ spots: [], isLoading: false, error: null });
  mockVisitedPins.pins = [];
  mockVisitedPins.remainingCount = 0;
  mockUseMapVisitedPins.mockImplementation(() => mockVisitedPins);
};

const renderMap = (props: Partial<React.ComponentProps<typeof MapSpotSearch>> = {}) =>
  render(
    <MapSpotSearch
      date={DATE}
      selectedSpotIds={[]}
      onSpotSelect={vi.fn()}
      isLimitReached={false}
      limitsError={false}
      {...props}
    />,
  );

const candidateButton = (name: string) =>
  within(screen.getByRole('list', { name: '中心にする場所' })).getByRole('button', { name });

const markerLabels = () => screen.getAllByTestId('map-marker').map((marker) => marker.dataset.label);

describe('MapSpotSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultLayerMocks();
    localStorage.clear();
    useSpotSearchStore.setState({ pinLayers: { wishlist: false, visited: false }, openOnPlanDate: false });
    useStoreForPlanning.setState({ plans: [createPlan()] });
    useSpotSearchStore.setState({ mapCenter: null, mapCenterLabel: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('初期表示', () => {
    it('出発地・目的地・その日のスポットのピンを表示し、目的地を基準にすること', () => {
      renderMap();

      expect(markerLabels()).toEqual(['S', 'G', '1', '2']);
      expect(candidateButton('京都タワー (目的地)')).toHaveClass('border-primary');
    });

    it('出発地と目的地が同じ地点なら S/G のピン1つにまとめること', () => {
      useStoreForPlanning.setState({ plans: [createPlan({ destination: location('京都駅', 34.9858, 135.7588) })] });

      renderMap();

      expect(markerLabels()).toEqual(['S/G', '1', '2']);
    });

    it('開いただけでは位置情報を取得しないこと', () => {
      const getCurrentPosition = vi.fn();
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });

      renderMap();

      expect(getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe('中心の変更', () => {
    it('候補を押すと中心と基準名が変わり、ズーム 15 で移動すること', () => {
      renderMap();

      fireEvent.click(candidateButton('① 清水寺'));

      expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 34.9949, lng: 135.785 });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBe('① 清水寺');
      expect(mapInstance.panTo).toHaveBeenCalledWith({ lat: 34.9949, lng: 135.785 });
      expect(mapInstance.setZoom).toHaveBeenCalledWith(15);
    });

    it('住所を入力して Enter を押すと、その地点に移動し基準名は「中心」になること', async () => {
      mockSearchByAddress.mockResolvedValue({ latitude: 41.7687, longitude: 140.7288, formattedAddress: '函館市元町' });
      renderMap();

      const input = screen.getByTestId('address-search-input');
      fireEvent.change(input, { target: { value: '函館市元町' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 41.7687, lng: 140.7288 });
      });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBeNull();
      expect(mapInstance.panTo).toHaveBeenCalledWith({ lat: 41.7687, lng: 140.7288 });
    });

    it('「現在地」を押すと位置情報を取得して移動すること', () => {
      const getCurrentPosition = vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 35.1, longitude: 135.2 } } as GeolocationPosition),
      );
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
      renderMap();

      fireEvent.click(candidateButton('現在地'));

      expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 35.1, lng: 135.2 });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBe('現在地');
    });

    it('位置情報の取得に失敗したらエラーを出し、中心は動かさないこと', () => {
      const getCurrentPosition = vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1 } as GeolocationPositionError),
      );
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
      renderMap();

      fireEvent.click(candidateButton('現在地'));

      expect(screen.getByText(/現在地を取得できませんでした/)).toBeInTheDocument();
      expect(useSpotSearchStore.getState().mapCenter).toBeNull();
    });

    it('地図をドラッグすると地図の中心を中心にし、基準名は「中心」になること', () => {
      renderMap();

      act(() => mapProps.current.onDragEnd?.());

      expect(useSpotSearchStore.getState().mapCenter).toMatchObject({ lat: 35.01, lng: 135.77 });
      expect(useSpotSearchStore.getState().mapCenterLabel).toBeNull();
    });
  });
});

describe('MapSpotSearch — POI の選択と追加', () => {
  const clickPoi = async (placeId = 'poi-yasaka') => {
    const event = poiClickEvent(placeId);
    await act(async () => {
      mapProps.current.onClick?.(event);
    });
    return event;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultLayerMocks();
    localStorage.clear();
    useSpotSearchStore.setState({ pinLayers: { wishlist: false, visited: false }, openOnPlanDate: false });
    useStoreForPlanning.setState({ plans: [createPlan()] });
    useSpotSearchStore.setState({ mapCenter: null, mapCenterLabel: null });
    mockFetchPlaceDetails.mockResolvedValue({ data: yasakaMeta, hasError: false });
  });

  it('POI を押すと Google 標準の吹き出しを止め、詳細を取得してカードを出すこと', async () => {
    renderMap();

    const event = await clickPoi();

    expect(event.stop).toHaveBeenCalled();
    expect(mockFetchPlaceDetails).toHaveBeenCalledWith('poi-yasaka');
    expect(await screen.findByText('八坂神社')).toBeInTheDocument();
  });

  it('同じ POI をもう一度押しても詳細を取得し直さないこと', async () => {
    renderMap();

    await clickPoi();
    await screen.findByText('八坂神社');
    await clickPoi();

    expect(mockFetchPlaceDetails).toHaveBeenCalledTimes(1);
  });

  it('詳細を取得できなかったときはカードにエラーを出すこと', async () => {
    mockFetchPlaceDetails.mockResolvedValue({ data: null, hasError: true });
    renderMap();

    await clickPoi();

    expect(await screen.findByText('情報を取得できませんでした')).toBeInTheDocument();
  });

  it('地図の何もない所を押すと選択を解除すること', async () => {
    renderMap();
    await clickPoi();
    await screen.findByText('八坂神社');

    act(() => mapProps.current.onClick?.({ latLng: null } as unknown as google.maps.MapMouseEvent));

    expect(screen.queryByTestId('selected-spot-card')).not.toBeInTheDocument();
  });

  it('距離は今の中心の基準名から表示すること（スマホは1行にまとめる）', async () => {
    useSpotSearchStore.setState({
      mapCenter: { id: 'kiyomizu', name: '清水寺', lat: 34.9949, lng: 135.785 },
      mapCenterLabel: '① 清水寺',
    });
    renderMap();

    await clickPoi();

    expect(await screen.findByTestId('selected-spot-summary-sp')).toHaveTextContent(
      '★4.4 ・ ① 清水寺から1.1km ・ 09:00-17:00',
    );
    expect(screen.getByTestId('selected-spot-summary-pc')).toHaveTextContent('① 清水寺から約1.1km');
    expect(screen.getByTestId('selected-spot-summary-pc')).toHaveTextContent('京都市東山区祇園町北側625');
  });

  it('アプリ側のピンを押すと詳細を取得せずにカードを出し、追加済みなら「選択解除」を出すこと', () => {
    const onSpotSelect = vi.fn();
    renderMap({ selectedSpotIds: ['kiyomizu', 'inari'], onSpotSelect });

    fireEvent.click(screen.getByTitle('① 清水寺'));

    expect(mockFetchPlaceDetails).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '選択解除' }));
    expect(onSpotSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'kiyomizu' }), true);
  });

  it('「計画に追加」を押すと onSpotSelect を呼び、追加後は「追加しました・取り消す」を出すこと', async () => {
    const onSpotSelect = vi.fn();
    const { rerender } = renderMap({ onSpotSelect });
    await clickPoi();

    fireEvent.click(await screen.findByRole('button', { name: '計画に追加' }));

    expect(onSpotSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'poi-yasaka', name: '八坂神社' }), false);
    // 追加されると selectedSpotIds に入る
    rerender(
      <MapSpotSearch
        date={DATE}
        selectedSpotIds={['kiyomizu', 'inari', 'poi-yasaka']}
        onSpotSelect={onSpotSelect}
        isLimitReached={false}
        limitsError={false}
      />,
    );
    expect(screen.getByText('追加しました')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取り消す' }));
    expect(onSpotSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'poi-yasaka' }), true);
  });

  it('上限に達しているときは「計画に追加」を押せず、理由を出すこと', async () => {
    renderMap({ isLimitReached: true });

    await clickPoi();

    expect(await screen.findByRole('button', { name: '計画に追加' })).toBeDisabled();
    expect(screen.getByText(/上限に達しています/)).toBeInTheDocument();
  });

  it('上限を取得できていないときも「計画に追加」を押せないこと', async () => {
    renderMap({ limitsError: true });

    await clickPoi();

    expect(await screen.findByRole('button', { name: '計画に追加' })).toBeDisabled();
  });

  it('計画日に休みの POI は休みのバッジと短い文言を出し、追加はできること', async () => {
    // 土曜休み
    mockFetchPlaceDetails.mockResolvedValue({
      data: { ...yasakaMeta, openingPeriods: yasakaMeta.openingPeriods.filter((p) => p.open.day !== 6) },
      hasError: false,
    });
    renderMap();

    await clickPoi();

    expect(await screen.findByTestId('opening-status-badge')).toHaveTextContent('定休日の可能性');
    expect(screen.getByTestId('selected-spot-summary-sp')).toHaveTextContent('土曜は休みの可能性');
    expect(screen.getByRole('button', { name: '計画に追加' })).toBeEnabled();
  });
});

describe('MapSpotSearch — 行きたいリスト・過去のスポットのピン', () => {
  // 日・火〜金のみ営業（月・土が休み）
  const weekdayPeriods = [0, 2, 3, 4, 5].map((day) => ({
    open: { day, hour: 10, minute: 0 },
    close: { day, hour: 17, minute: 0 },
  }));
  const wishlistSpot = (id: string, overrides: Partial<Spot> = {}): Spot =>
    ({
      id,
      location: { id, name: id, lat: 35.0, lng: 135.77 },
      rating: 4.2,
      ...overrides,
    }) as Spot;

  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultLayerMocks();
    localStorage.clear();
    useSpotSearchStore.setState({
      mapCenter: null,
      mapCenterLabel: null,
      pinLayers: { wishlist: false, visited: false },
      openOnPlanDate: false,
    });
    useStoreForPlanning.setState({ plans: [createPlan()] });
  });

  it('初めて開いたときはピンを出さず、行きたいリスト・過去のスポットの取得も始めないこと', () => {
    renderMap();

    expect(mockUseWishlistSpots).not.toHaveBeenCalled();
    expect(mockUseMapVisitedPins).toHaveBeenLastCalledWith(false);
    expect(markerLabels()).toEqual(['S', 'G', '1', '2']);
  });

  it('行きたいリストを ON にするとハートのピンが出て、ON の状態を保存すること', () => {
    mockUseWishlistSpots.mockReturnValue({ spots: [wishlistSpot('heart-1')], isLoading: false, error: null });
    renderMap();

    fireEvent.click(screen.getByRole('checkbox', { name: '行きたいリスト' }));

    expect(markerLabels()).toContain('♥');
    expect(JSON.parse(localStorage.getItem('moptabi:map-pin-layers') ?? '{}')).toEqual({
      wishlist: true,
      visited: false,
    });
  });

  it('保存した ON の状態を次に開いたときに復元すること', () => {
    localStorage.setItem('moptabi:map-pin-layers', JSON.stringify({ wishlist: false, visited: true }));

    renderMap();

    expect(mockUseMapVisitedPins).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('checkbox', { name: '過去のスポット' })).toBeChecked();
  });

  it('計画日に休みのピンは薄く表示し、「計画日に休みのピンを隠す」を ON にすると描かないこと', () => {
    // 2026-10-17（土）に休み
    const saturdayClosed = weekdayPeriods;
    mockUseWishlistSpots.mockReturnValue({
      spots: [wishlistSpot('closed', { openingPeriods: saturdayClosed }), wishlistSpot('open')],
      isLoading: false,
      error: null,
    });
    useSpotSearchStore.setState({ pinLayers: { wishlist: true, visited: false } });
    localStorage.setItem('moptabi:map-pin-layers', JSON.stringify({ wishlist: true, visited: false }));
    renderMap();

    expect(screen.getByTitle('closed')).toHaveAttribute('data-opacity', '0.4');
    expect(screen.getByTitle('open')).toHaveAttribute('data-opacity', '1');

    fireEvent.click(screen.getByRole('checkbox', { name: '計画日に休みのピンを隠す' }));

    expect(screen.queryByTitle('closed')).not.toBeInTheDocument();
    expect(useSpotSearchStore.getState().openOnPlanDate).toBe(true);
  });

  it('プランに入っているスポットは行きたいリストのピンを重ねないこと', () => {
    mockUseWishlistSpots.mockReturnValue({ spots: [wishlistSpot('kiyomizu')], isLoading: false, error: null });
    localStorage.setItem('moptabi:map-pin-layers', JSON.stringify({ wishlist: true, visited: false }));

    renderMap({ selectedSpotIds: ['kiyomizu', 'inari'] });

    expect(markerLabels()).not.toContain('♥');
  });

  it('滞在時間が営業時間外になるプランのスポットのピンに印を付けること', () => {
    const periods = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      open: { day, hour: 10, minute: 0 },
      close: { day, hour: 17, minute: 0 },
    }));
    useStoreForPlanning.setState({
      plans: [
        createPlan({
          spots: [
            createSpot({ openingPeriods: periods }),
            createSpot({
              id: 'inari',
              name: '伏見稲荷大社',
              stayStart: '08:00',
              stayEnd: '09:00',
              openingPeriods: periods,
            }),
          ],
        }),
      ],
    });

    renderMap();

    expect(markerLabels()).toEqual(['S', 'G', '1', '2!']);
    expect(screen.getByTitle('② 伏見稲荷大社（営業時間外）')).toBeInTheDocument();
  });

  it('座標だけの過去のスポットのピンを押すと、そのスポットだけ詳細を取得すること', async () => {
    mockFetchPlaceDetails.mockResolvedValue({ data: { ...yasakaMeta, spotId: 'visited-1' }, hasError: false });
    mockVisitedPins.pins = [{ spotId: 'visited-1', lat: 35.0, lng: 135.77, spot: null }];
    localStorage.setItem('moptabi:map-pin-layers', JSON.stringify({ wishlist: false, visited: true }));
    renderMap();

    const visitedMarker = screen.getAllByTestId('map-marker').find((marker) => marker.dataset.label === '✓');
    await act(async () => {
      fireEvent.click(visitedMarker as HTMLElement);
    });

    expect(mockFetchPlaceDetails).toHaveBeenCalledWith('visited-1');
    expect(await screen.findByText('八坂神社')).toBeInTheDocument();
  });

  it('位置を取得していない過去のスポットがあるときは件数と「さらに表示」を出すこと', () => {
    mockVisitedPins.remainingCount = 5;
    localStorage.setItem('moptabi:map-pin-layers', JSON.stringify({ wishlist: false, visited: true }));
    renderMap();

    expect(screen.getByText('位置を取得していないスポットが 5 件')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'さらに表示' }));
    expect(mockVisitedPins.loadMore).toHaveBeenCalled();
  });
});
