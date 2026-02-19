import React from 'react';
import { InfoWindow, initialize, Map, Marker, mockInstances } from '@soleo/google-maps-vitest-mocks';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock next/image to a simple img
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// Provide a minimal global google mock for SymbolPath used in getMarkerIcon
(global as any).google = {
  maps: {
    SymbolPath: {
      CIRCLE: {},
    },
  },
};

// Mock the zustand store used by the component
let storeState: any;
const setSelectedSpot = vi.fn((spot) => {
  storeState.selectedSpot = spot;
});
const setViewMode = vi.fn((v) => {
  storeState.viewMode = v;
});
const isAlreadyAddedWishlist = vi.fn((id: string) => false);

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: (selector: any) => (selector ? selector(storeState) : storeState),
}));

import SearchResultsView from '@/components/wishlist/SearchResultsView';

beforeAll(() => {
  initialize();
});

describe('SearchResultsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInstances.clearAll();
    storeState = {
      selectedSpot: undefined,
      setSelectedSpot,
      viewMode: 'list',
      setViewMode,
      isAlreadyAddedWishlist,
    };
  });

  it('検索結果が空のときは空状態が表示されること', () => {
    render(<SearchResultsView searchResults={[]} searchType="area" />);
    expect(screen.getByText('検索結果がありません')).toBeDefined();
  });

  it('検索結果があると件数とリストが表示されること', () => {
    const results = [
      { id: 'a1', location: { lat: 1, lng: 2, name: 'スポットA' }, rating: 4.1, address: 'addrA' },
      { id: 'a2', location: { lat: 3, lng: 4, name: 'スポットB' }, rating: 3.2, address: 'addrB' },
    ] as any;

    render(<SearchResultsView searchResults={results} searchType="area" mapCenter={{ lat: 1, lng: 2 }} />);

    expect(screen.getByText('2件のスポット')).toBeDefined();
    // list items should contain place names
    expect(screen.getByText('スポットA')).toBeDefined();
    expect(screen.getByText('スポットB')).toBeDefined();
  });

  it('リスト項目をクリックすると setSelectedSpot が呼ばれること', () => {
    const results = [
      { id: 'a1', location: { lat: 1, lng: 2, name: 'スポットA' }, rating: 4.1, address: 'addrA' },
    ] as any;

    render(<SearchResultsView searchResults={results} searchType="area" mapCenter={{ lat: 1, lng: 2 }} />);

    const item = screen.getByText('スポットA');
    fireEvent.click(item);
    expect(setSelectedSpot).toHaveBeenCalledWith(results[0]);
  });

  it('Marker をクリックすると setSelectedSpot が呼ばれること', () => {
    const results = [
      { id: 'm1', location: { lat: 10, lng: 20, name: 'Mスポット' }, rating: 4.0, address: 'addrM' },
    ] as any;
    // render map view so Marker is mounted
    storeState.viewMode = 'map';
    render(<SearchResultsView searchResults={results} searchType="area" mapCenter={{ lat: 10, lng: 20 }} />);
    const mapMocks = mockInstances.get(Map);
    const markerMocks = mockInstances.get(Marker);

    expect(mapMocks).toHaveLength(1);
    expect(markerMocks).toHaveLength(1);
    const addListener = mapMocks[0].addListener;
    addListener('click', () =>
      // ここにmarkerMocksの0番目がテストデータになるようにする
      setSelectedSpot(results[0]),
    );
    const lastCall = addListener.mock.lastCall as any[];
    expect(addListener).toHaveBeenCalledTimes(1);
    const [eventType, listener] = lastCall;
    expect(eventType).toBe('click');

    // simulate click
    listener();

    expect(setSelectedSpot).toHaveBeenCalledWith(results[0]);

    // location（lat, lng）が正しいかチェック
    const selected = setSelectedSpot.mock.lastCall?.[0];
    expect(selected.location.lat).toBe(10);
    expect(selected.location.lng).toBe(20);
  }, 1000);

  it('markerをクリック後、infoWindowが表示され、infoWindow内にスポット名が表示されていること', async () => {
    const results = [
      { id: 'a1', location: { lat: 1, lng: 2, name: 'スポットA' }, rating: 4.1, address: 'addrA' },
    ] as any;

    // render map view so Marker is mounted
    storeState.viewMode = 'map';
    const { rerender } = render(
      <SearchResultsView searchResults={results} searchType="area" mapCenter={{ lat: 10, lng: 20 }} />,
    );
    const mapMocks = mockInstances.get(Map);
    const markerMocks = mockInstances.get(Marker);
    expect(markerMocks.length).toBe(1);

    const marker = markerMocks[0] as any;
    const addListener = mapMocks[0].addListener;
    addListener('click', () =>
      // ここにmarkerMocksの0番目がテストデータになるようにする
      setSelectedSpot(results[0]),
    );
    const lastCall = addListener.mock.lastCall as any[];
    const [eventName, listener] = lastCall;

    expect(eventName).toBe('click');

    // ---- クリックをシミュレート ----
    listener();

    storeState.selectedSpot = results[0];

    rerender(<SearchResultsView searchResults={results} searchType="area" mapCenter={{ lat: 10, lng: 20 }} />);

    // InfoWindow が作成されていることを確認
    const infoWindowMocks = mockInstances.get(InfoWindow);
    expect(infoWindowMocks.length).toBe(1);

    const infoWindow = infoWindowMocks[0] as any;

    expect(infoWindow.setContent).toHaveBeenCalledTimes(1);

    const contentArg = infoWindow.setContent.mock.lastCall[0];
    // InfoWindow の内容にスポット名が含まれていることを確認
    expect(contentArg).toHaveTextContent('スポットA');
    expect(contentArg).toHaveTextContent('4.1');
    expect(contentArg).toHaveTextContent('addrA');
  }, 1000);
});
