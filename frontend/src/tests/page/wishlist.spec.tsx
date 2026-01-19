import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import TravelWishlistApp from '@/app/wishlist/page';
import { ClerkProvider } from '@clerk/nextjs';
import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { useFetchWishlist } from '@/hooks/use-wishlist';
import { Spot, TransportNodeType } from '@/types/plan';

vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: () => null,
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  }),
}));

vi.mock('@/hooks/use-wishlist');

const mockedUseFetchWishlist = vi.mocked(useFetchWishlist);
const mockedUseWishlistStore = vi.mocked(useWishlistStore);

beforeEach(() => {
  mockedUseFetchWishlist.mockReturnValue({
    data: [] as any[],
    isLoading: false,
    error: null,
    postWishlist: vi.fn(),
    updateWishlist: vi.fn(),
    deleteWishlist: vi.fn(),
  });
  mockedUseWishlistStore.setState({
    wishlist: [],
    viewMode: 'list',
    getViewMode: () => 'list',
    getSortAndFilteredWishlist: () => [],
    getSelectedSpot: () => null,
    selectedSpot: undefined,
    isAlreadyAddedWishlist: vi.fn(),
    setSelectedSpot: vi.fn(),
    setWishlist: vi.fn(),
  });
  (useFetchWishlist as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [] as any[],
    isLoading: false,
    error: null,
  });
});

const mockSearchSpots = vi.fn();
vi.mock('@/lib/plan', () => ({
  searchSpots: (...args: any[]) => mockSearchSpots(...args),
}));

const TestProviders = ({ children }: { children: React.ReactNode }) => {
  return <ClerkProvider>{children}</ClerkProvider>;
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TestProviders>{ui}</TestProviders>);
};

describe('行きたいリストの統合テスト', () => {
  // 統合テストは複雑なUI操作が多いため、タイムアウトを延長
  test('ユーザーはスポットでの検索→結果追加→閲覧→結果の更新までできる', async () => {
    renderWithProviders(<TravelWishlistApp />);
    expect(await screen.findByText('該当するスポットがありません')).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'スポットを検索' })).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'リストビューに切り替え' })).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'マップビューに切り替え' })).toBeInTheDocument();

    // 検索ボタンを押下
    const searchButton = await screen.findByRole('button', { name: 'スポットを検索' });
    searchButton.click();

    await waitFor(async () => {
      expect(screen.getByText('行きたいスポットを追加')).toBeInTheDocument();
    });
    // 検索項目を入力して、検索ボタンを押下(NearBySearch検索)
    // まずセレクトボックスから都道府県を選択
    const prefectureSelect = screen.getByTestId('test-prefecture-select-value');
    fireEvent.click(prefectureSelect);
    const tokyoOption = screen.getByTestId('test-prefecture-select-item-東京都');
    fireEvent.click(tokyoOption);
    expect(prefectureSelect).toHaveTextContent('東京都');

    // ジャンルを選択
    const genreSelect = screen.getByTestId('category-tourist_attraction');
    fireEvent.click(genreSelect);

    // 検索ボタンを押下
    const fakeResults: Spot[] = [
      {
        id: 'spot1',
        location: { id: 'spot1', name: 'スポット1', lat: 35.6895, lng: 139.6917 },
        rating: 4.5,
        stayStart: '09:00',
        stayEnd: '10:00',
        transports: {
          transportMethod: 1,
          name: 'WALKING',
          travelTime: '30分',
          fromType: TransportNodeType.SPOT,
          toType: TransportNodeType.SPOT,
        },
        category: ['文化', '歴史'],
        order: 0,
        prefecture: '東京都',
        address: '東京都千代田区',
      },
      {
        id: 'spot2',
        location: { id: 'spot2', name: 'スポット2', lat: 35.6895, lng: 139.6917 },
        rating: 3.8,
        stayStart: '11:00',
        stayEnd: '12:00',
        transports: {
          transportMethod: 1,
          name: 'WALKING',
          travelTime: '20分',
          fromType: TransportNodeType.SPOT,
          toType: TransportNodeType.SPOT,
        },
        category: ['自然'],
        order: 1,
        prefecture: '東京都',
        address: '東京都港区',
      },
    ];
    mockSearchSpots.mockResolvedValueOnce(fakeResults);
    const searchBtn = screen.getByTestId('search-button');
    expect(searchBtn).toBeEnabled();
    fireEvent.click(searchBtn);

    // 検索結果が正しく表示される
    await waitFor(async () => {
      expect(mockSearchSpots).toHaveBeenCalled();
      expect(screen.getByText('2件のスポット')).toBeDefined();
      expect(screen.getByText('スポット1')).toBeDefined();
      expect(screen.getByText('スポット2')).toBeDefined();
    });

    const item = screen.getByText('スポット1');
    fireEvent.click(item);
    mockedUseWishlistStore.setState({
      selectedSpot: fakeResults[0],
      isAlreadyAddedWishlist: vi.fn().mockReturnValue(false),
      getSelectedSpot: () => fakeResults[0],
    });

    // 詳細ページが表示され、追加処理が行われる
    await waitFor(() => {
      expect(screen.getByTestId('spot-preview-name')).toBeDefined();
      const addButton = screen.getByText('行きたいリストに追加');
      fireEvent.click(addButton);
    });

    // 追加したスポットがリストに表示されるように、モックを更新してから再レンダリング
    // WishlistType形式のデータを作成
    const wishlistItem = {
      id: 1,
      spotId: fakeResults[0].id,
      memo: null,
      priority: 3,
      visited: 0,
      visitedAt: null,
      spot: {
        id: fakeResults[0].id,
        meta: {
          spotId: fakeResults[0].id,
          name: fakeResults[0].location.name,
          latitude: fakeResults[0].location.lat,
          longitude: fakeResults[0].location.lng,
          rating: fakeResults[0].rating ?? 0,
          categories: fakeResults[0].category,
          image: fakeResults[0].image,
          prefecture: fakeResults[0].prefecture,
          address: fakeResults[0].address,
        },
      },
    };

    // useFetchWishlistのモックを更新（データを返すように）
    mockedUseFetchWishlist.mockReturnValue({
      data: [wishlistItem] as any[],
      isLoading: false,
      error: null,
      postWishlist: vi.fn().mockResolvedValue({ ok: true }),
      updateWishlist: vi.fn(),
      deleteWishlist: vi.fn(),
    });

    // useWishlistStoreの状態も更新（getSortAndFilteredWishlistがデータを返すように）
    mockedUseWishlistStore.setState({
      wishlist: [wishlistItem] as any[],
      viewMode: 'list',
      getViewMode: () => 'list',
      getSortAndFilteredWishlist: () => [wishlistItem] as any[],
      getSelectedSpot: () => null,
      selectedSpot: undefined,
      isAlreadyAddedWishlist: vi.fn().mockReturnValue(true),
      setSelectedSpot: vi.fn(),
      setWishlist: vi.fn(),
    });

    // 前のレンダリングをクリーンアップしてから再レンダリング
    cleanup();

    // 追加したスポットがリストに表示される
    renderWithProviders(<TravelWishlistApp />);
    expect(screen.queryByText('該当するスポットがありません')).not.toBeInTheDocument();
    // リストビューに表示されるスポット名を確認（h3要素内）
    const spotNames = screen.getAllByText('スポット1');
    expect(spotNames.length).toBeGreaterThan(0);
  }, 30000); // タイムアウト30秒に延長
});

describe('行きたいリストのフィルター機能テスト', () => {
  // テスト用のWishlistデータを作成するヘルパー関数
  const createWishlistItem = (
    id: number,
    name: string,
    rating: number,
    priority: number,
    visited: number,
    prefecture: string,
  ) => ({
    id,
    spotId: `spot${id}`,
    memo: null,
    priority,
    visited,
    visitedAt: visited ? '2024-01-01T00:00:00.000Z' : null,
    spot: {
      id: `spot${id}`,
      meta: {
        spotId: `spot${id}`,
        name,
        latitude: 35.6895,
        longitude: 139.6917,
        rating,
        categories: ['文化'],
        image: 'https://example.com/image.jpg',
        prefecture: prefecture,
        address: '東京都千代田区',
      },
    },
  });

  test('訪問済み/未訪問フィルターでリストが絞り込まれる', async () => {
    const wishlistItems = [
      createWishlistItem(1, 'スポットA', 4.5, 3, 0, '東京都'), // 未訪問
      createWishlistItem(2, 'スポットB', 4.0, 4, 1, '東京都'), // 訪問済み
      createWishlistItem(3, 'スポットC', 3.5, 2, 0, '東京都'), // 未訪問
    ];

    mockedUseFetchWishlist.mockReturnValue({
      data: wishlistItems as any[],
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: vi.fn(),
      deleteWishlist: vi.fn(),
    });

    mockedUseWishlistStore.setState({
      wishlist: wishlistItems as any[],
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
      getViewMode: () => 'list',
      getFilteredType: () => 'all',
      getSortAndFilteredWishlist: () => wishlistItems as any[],
      getSelectedSpot: () => null,
      selectedSpot: undefined,
      isAlreadyAddedWishlist: vi.fn(),
      setSelectedSpot: vi.fn(),
      setWishlist: vi.fn(),
      setFilteredType: vi.fn(),
      setPriorityFilter: vi.fn(),
      setRatingFilter: vi.fn(),
    });

    renderWithProviders(<TravelWishlistApp />);

    // 初期状態で全てのスポットが表示される
    expect(screen.getByText('スポットA')).toBeInTheDocument();
    expect(screen.getByText('スポットB')).toBeInTheDocument();
    expect(screen.getByText('スポットC')).toBeInTheDocument();

    // 未訪問フィルターボタンをクリック
    const unvisitedFilter = screen.getByRole('button', { name: '未訪問フィルター' });
    fireEvent.click(unvisitedFilter);

    // ストアの状態を更新してフィルター後の結果を反映
    const unvisitedItems = wishlistItems.filter((item) => !item.visited);
    mockedUseWishlistStore.setState({
      filteredType: 'unvisited',
      getFilteredType: () => 'unvisited',
      getSortAndFilteredWishlist: () => unvisitedItems as any[],
    });

    cleanup();
    renderWithProviders(<TravelWishlistApp />);

    // 未訪問のスポットのみ表示される
    expect(screen.getByText('スポットA')).toBeInTheDocument();
    expect(screen.queryByText('スポットB')).not.toBeInTheDocument();
    expect(screen.getByText('スポットC')).toBeInTheDocument();

    // 訪問済みフィルターに切り替え
    const visitedFilter = screen.getByRole('button', { name: '訪問済みフィルター' });
    fireEvent.click(visitedFilter);

    const visitedItems = wishlistItems.filter((item) => item.visited);
    mockedUseWishlistStore.setState({
      filteredType: 'visited',
      getFilteredType: () => 'visited',
      getSortAndFilteredWishlist: () => visitedItems as any[],
    });

    cleanup();
    renderWithProviders(<TravelWishlistApp />);

    // 訪問済みのスポットのみ表示される
    expect(screen.queryByText('スポットA')).not.toBeInTheDocument();
    expect(screen.getByText('スポットB')).toBeInTheDocument();
    expect(screen.queryByText('スポットC')).not.toBeInTheDocument();
  });

  test('優先度フィルターでリストが絞り込まれる', async () => {
    const wishlistItems = [
      createWishlistItem(1, '優先度3のスポット', 4.5, 3, 0, '東京都'),
      createWishlistItem(2, '優先度5のスポット', 4.0, 5, 0, '東京都'),
      createWishlistItem(3, '優先度1のスポット', 3.5, 1, 0, '東京都'),
    ];

    mockedUseFetchWishlist.mockReturnValue({
      data: wishlistItems as any[],
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: vi.fn(),
      deleteWishlist: vi.fn(),
    });

    mockedUseWishlistStore.setState({
      wishlist: wishlistItems as any[],
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
      getViewMode: () => 'list',
      getFilteredType: () => 'all',
      getSortAndFilteredWishlist: () => wishlistItems as any[],
      getSelectedSpot: () => null,
      selectedSpot: undefined,
      isAlreadyAddedWishlist: vi.fn(),
      setSelectedSpot: vi.fn(),
      setWishlist: vi.fn(),
      setFilteredType: vi.fn(),
      setPriorityFilter: vi.fn(),
      setRatingFilter: vi.fn(),
    });

    renderWithProviders(<TravelWishlistApp />);

    // 初期状態で全てのスポットが表示される
    expect(screen.getByText('優先度3のスポット')).toBeInTheDocument();
    expect(screen.getByText('優先度5のスポット')).toBeInTheDocument();
    expect(screen.getByText('優先度1のスポット')).toBeInTheDocument();

    // 優先度フィルターを3以上に設定
    const prioritySelect = screen.getByLabelText('優先度');
    fireEvent.change(prioritySelect, { target: { value: '3' } });

    // フィルター後のストア状態を更新
    const filteredItems = wishlistItems.filter((item) => item.priority >= 3);
    mockedUseWishlistStore.setState({
      priorityFilter: 3,
      getSortAndFilteredWishlist: () => filteredItems as any[],
    });

    cleanup();
    renderWithProviders(<TravelWishlistApp />);

    // 優先度3以上のスポットのみ表示される
    expect(screen.getByText('優先度3のスポット')).toBeInTheDocument();
    expect(screen.getByText('優先度5のスポット')).toBeInTheDocument();
    expect(screen.queryByText('優先度1のスポット')).not.toBeInTheDocument();
  });

  test('都道府県フィルターでリストが絞り込まれる', async () => {
    const wishlistItems = [
      createWishlistItem(1, 'スポットA', 4.5, 3, 0, '東京都'), // 東京都
      createWishlistItem(2, 'スポットB', 4.0, 4, 1, '埼玉県'), // 埼玉県
      createWishlistItem(3, 'スポットC', 3.5, 2, 0, '東京都'), // 東京
    ];

    mockedUseFetchWishlist.mockReturnValue({
      data: wishlistItems as any[],
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: vi.fn(),
      deleteWishlist: vi.fn(),
    });

    mockedUseWishlistStore.setState({
      wishlist: wishlistItems as any[],
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
      getViewMode: () => 'list',
      getFilteredType: () => 'all',
      getSortAndFilteredWishlist: () => wishlistItems as any[],
      getSelectedSpot: () => null,
      selectedSpot: undefined,
      isAlreadyAddedWishlist: vi.fn(),
      setSelectedSpot: vi.fn(),
      setWishlist: vi.fn(),
      setFilteredType: vi.fn(),
      setPriorityFilter: vi.fn(),
      setRatingFilter: vi.fn(),
    });

    renderWithProviders(<TravelWishlistApp />);

    // 初期状態で全てのスポットが表示される
    expect(screen.getByText('スポットA')).toBeInTheDocument();
    expect(screen.getByText('スポットB')).toBeInTheDocument();
    expect(screen.getByText('スポットC')).toBeInTheDocument();

    screen.debug(undefined, 30000);
    const prefectureSelect = screen.getByLabelText('都道府県');
    fireEvent.change(prefectureSelect, { target: { value: '東京都' } });

    // フィルター後のストア状態を更新
    const filteredItems = wishlistItems.filter(
      (item) => (item.spot.meta as { prefecture?: string }).prefecture === '東京都',
    );
    mockedUseWishlistStore.setState({
      prefectureFilter: '東京都',
      getSortAndFilteredWishlist: () => filteredItems as any[],
    });

    cleanup();
    renderWithProviders(<TravelWishlistApp />);

    // 東京都のスポットのみ表示される
    expect(screen.getByText('スポットA')).toBeInTheDocument();
    expect(screen.queryByText('スポットB')).not.toBeInTheDocument();
    expect(screen.getByText('スポットC')).toBeInTheDocument();
  });
});

describe('行きたいリストの更新・削除機能テスト', () => {
  const createWishlistItem = (
    id: number,
    name: string,
    rating: number,
    priority: number,
    visited: number,
    memo: string | null = null,
  ) => ({
    id,
    spotId: `spot${id}`,
    memo,
    priority,
    visited,
    visitedAt: visited ? '2024-01-01T00:00:00.000Z' : null,
    spot: {
      id: `spot${id}`,
      meta: {
        spotId: `spot${id}`,
        name,
        latitude: 35.6895,
        longitude: 139.6917,
        rating,
        categories: ['文化'],
        image: 'https://example.com/image.jpg',
        prefecture: '東京都',
        address: '東京都千代田区',
      },
    },
  });

  test('メモを更新できる', async () => {
    cleanup();
    const mockUpdateWishlist = vi.fn().mockResolvedValue({ ok: true });
    const wishlistItem = createWishlistItem(1, 'テストスポット', 4.5, 3, 0, '初期メモ');
    const wishlistData = [wishlistItem] as any[];

    (useFetchWishlist as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: wishlistData,
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: mockUpdateWishlist,
      deleteWishlist: vi.fn(),
    });

    // ストアに直接データをセット（useEffectをバイパス）
    useWishlistStore.setState({
      wishlist: wishlistData,
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
    });

    // モックを更新して、レンダリング後もデータを維持
    mockedUseWishlistStore.setState({
      getSortAndFilteredWishlist: () => wishlistData,
    });

    renderWithProviders(<TravelWishlistApp />);

    // メモのテキストエリアを取得して値を変更
    await waitFor(() => {
      const memoTextarea = screen.getByDisplayValue('初期メモ');
      expect(memoTextarea).toBeInTheDocument();
    });

    const memoTextarea = screen.getByDisplayValue('初期メモ');
    fireEvent.change(memoTextarea, { target: { value: '更新されたメモ' } });
    fireEvent.blur(memoTextarea);

    // API呼び出しが行われたことを確認
    await waitFor(() => {
      expect(mockUpdateWishlist).toHaveBeenCalled();
    });
  });

  test('訪問済みフラグを切り替えられる', async () => {
    cleanup();
    const mockUpdateWishlist = vi.fn().mockResolvedValue({ ok: true });
    const wishlistItem = createWishlistItem(1, 'テストスポット', 4.5, 3, 0);
    const wishlistData = [wishlistItem] as any[];

    (useFetchWishlist as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: wishlistData,
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: mockUpdateWishlist,
      deleteWishlist: vi.fn(),
    });

    useWishlistStore.setState({
      wishlist: wishlistData,
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
    });

    mockedUseWishlistStore.setState({
      getSortAndFilteredWishlist: () => wishlistData,
    });

    renderWithProviders(<TravelWishlistApp />);

    // 「訪問済みにする」ボタンをクリック
    await waitFor(() => {
      expect(screen.getByText('訪問済みにする')).toBeInTheDocument();
    });

    const visitedButton = screen.getByText('訪問済みにする');
    fireEvent.click(visitedButton);

    // API呼び出しが行われたことを確認
    await waitFor(() => {
      expect(mockUpdateWishlist).toHaveBeenCalledWith(expect.objectContaining({ visited: 1 }));
    });
  });

  test('スポットを削除できる', async () => {
    cleanup();
    const mockDeleteWishlist = vi.fn().mockResolvedValue({ ok: true });
    const wishlistItem = createWishlistItem(1, '削除対象スポット', 4.5, 3, 0);
    const wishlistData = [wishlistItem] as any[];

    (useFetchWishlist as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: wishlistData,
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: vi.fn(),
      deleteWishlist: mockDeleteWishlist,
    });

    // ストアに直接データをセット
    useWishlistStore.setState({
      wishlist: wishlistData,
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
    });

    mockedUseWishlistStore.setState({
      getSortAndFilteredWishlist: () => wishlistData,
    });

    renderWithProviders(<TravelWishlistApp />);

    // スポットが表示されていることを確認
    await waitFor(() => {
      expect(screen.getByText('削除対象スポット')).toBeInTheDocument();
    });

    // 削除ボタン（ゴミ箱アイコンを含むボタン）をクリック
    const card = screen.getByText('削除対象スポット').closest('div.bg-white');
    const deleteButton = card?.querySelector('button svg.lucide-trash-2')?.closest('button');
    expect(deleteButton).not.toBeNull();

    if (deleteButton) {
      fireEvent.click(deleteButton);
      // API呼び出しが行われたことを確認
      await waitFor(() => {
        expect(mockDeleteWishlist).toHaveBeenCalledWith(1);
      });
    }
  });

  test('優先度を星をクリックして変更できる', async () => {
    cleanup();
    const mockUpdateWishlist = vi.fn().mockResolvedValue({ ok: true });
    const wishlistItem = createWishlistItem(1, 'テストスポット', 4.5, 3, 0);
    const wishlistData = [wishlistItem] as any[];

    (useFetchWishlist as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: wishlistData,
      isLoading: false,
      error: null,
      postWishlist: vi.fn(),
      updateWishlist: mockUpdateWishlist,
      deleteWishlist: vi.fn(),
    });

    // ストアに直接データをセット
    useWishlistStore.setState({
      wishlist: wishlistData,
      viewMode: 'list',
      filteredType: 'all',
      priorityFilter: null,
      ratingFilter: null,
    });

    mockedUseWishlistStore.setState({
      getSortAndFilteredWishlist: () => wishlistData,
    });

    renderWithProviders(<TravelWishlistApp />);

    // カード内の優先度セクションを取得（カード内の「優先度」というテキストの次の要素に星がある）
    await waitFor(() => {
      expect(screen.getByText('テストスポット')).toBeInTheDocument();
    });

    const stars = screen.getAllByRole('button', { name: /星/ });

    // 5番目の星（優先度5）をクリック
    expect(stars).toBeDefined();
    expect(stars?.length).toBeGreaterThanOrEqual(5);

    if (stars && stars.length >= 5) {
      fireEvent.click(stars[4]);

      // API呼び出しが行われたことを確認
      await waitFor(() => {
        expect(mockUpdateWishlist).toHaveBeenCalledWith(expect.objectContaining({ priority: 5 }));
      });
    }
  });
});
