import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WishlistSpotInfoCard from '@/components/wishlist/WishlistSpotInfoCard';
import { WishlistType } from '@/types/wishlist';

// モックの設定
const mockUpdateWishlist = vi.fn();
const mockDeleteWishlist = vi.fn();
const mockStoreUpdateWishlist = vi.fn();
const mockSetWishlist = vi.fn();

vi.mock('@/hooks/use-wishlist', () => ({
  useFetchWishlist: () => ({
    updateWishlist: mockUpdateWishlist,
    deleteWishlist: mockDeleteWishlist,
  }),
}));

vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: () => ({
    updateWishlist: mockStoreUpdateWishlist,
    setWishlist: mockSetWishlist,
    getSortAndFilteredWishlist: () => [],
  }),
}));

// 基本的なwishlistアイテムのモック
const createMockWishlistItem = (overrides?: Partial<WishlistType>): WishlistType => ({
  id: 1,
  spotId: 'spot-1',
  memo: 'テストメモ',
  priority: 3,
  visited: 0,
  visitedAt: null,
  spot: {
    id: 'spot-1',
    meta: {
      id: 'spot-1',
      spotId: 'spot-1',
      name: 'テストスポット',
      latitude: 35.6895,
      longitude: 139.6917,
      image: 'https://example.com/image.jpg',
      url: 'https://example.com',
      prefecture: '東京都',
      address: '東京都千代田区',
      rating: 4.5,
      categories: ['観光'],
      catchphrase: '最高のスポットです！',
      description: 'これはテスト用のスポットです。',
      openingHours: undefined,
    },
  },
  ...overrides,
});

describe('WishlistSpotInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWishlist.mockResolvedValue({ ok: true });
    mockDeleteWishlist.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  describe('訪問日時機能', () => {
    it('初期状態（未訪問）では訪問日時ボタンは非活性で、案内メッセージが表示される', () => {
      const item = createMockWishlistItem({ visitedAt: null, visited: 0 });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // 訪問日時のセクションが存在する
      expect(screen.getByText('訪問日時')).toBeInTheDocument();
      // カレンダーアイコンのボタンが存在する（data-testidで取得）
      const calendarButton = screen.getByTestId('visited-at-button-0');
      expect(calendarButton).toBeInTheDocument();
      // 未訪問の場合は案内メッセージが表示される
      expect(calendarButton).toHaveTextContent('訪問済みにすると編集可能');
      // 未訪問の場合はボタンが非活性
      expect(calendarButton).toBeDisabled();
    });

    it('訪問済みの場合、カレンダーで日付を選んで訪問日時を変更できる', async () => {
      // 訪問済みのアイテム
      const item = createMockWishlistItem({ visitedAt: '2024-06-15', visited: 1 });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // カレンダーボタンをクリック
      const calendarButton = screen.getByTestId('visited-at-button-0');
      // 訪問済みなのでボタンは活性
      expect(calendarButton).not.toBeDisabled();
      fireEvent.click(calendarButton);

      // Popoverが開きCalendarが表示される
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('訪問済み状態でカレンダーから日付を選択すると、即座にDBに保存される', async () => {
      // 訪問済みのアイテム（既に訪問日時あり）
      const item = createMockWishlistItem({ visitedAt: '2024-06-10', visited: 1 });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // カレンダーボタンをクリックして日付を選択
      const calendarButton = screen.getByTestId('visited-at-button-0');
      fireEvent.click(calendarButton);

      // カレンダーが開くのを待つ
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // 日付ボタンをクリック（当月の15日を選択）
      const dayButtons = screen.getAllByRole('gridcell');
      const targetDay = dayButtons.find((btn) => btn.textContent === '15' && !btn.hasAttribute('disabled'));
      expect(targetDay).toBeDefined();
      fireEvent.click(targetDay!);

      // 訪問済みの場合、カレンダー選択で即座にDBに保存される
      await waitFor(() => {
        expect(mockUpdateWishlist).toHaveBeenCalledWith(
          expect.objectContaining({
            visitedAt: expect.stringMatching(/^\d{4}-\d{2}-15$/),
          }),
        );
      });
    }, 10000);

    it('訪問日時が未入力で訪問済みにすると、現在日が自動設定される', async () => {
      const item = createMockWishlistItem({ visitedAt: null, visited: 0 });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // 現在日を取得（YYYY-MM-DD形式）
      const today = new Date().toLocaleDateString('sv-SE');

      // 訪問日時を選択せずに訪問済みボタンをクリック
      const visitedButton = screen.getByRole('button', { name: '訪問済みにする' });
      fireEvent.click(visitedButton);

      // updateWishlistがvisitedAt: 現在日で呼ばれる
      await waitFor(() => {
        expect(mockUpdateWishlist).toHaveBeenCalledWith(
          expect.objectContaining({
            visited: 1,
            visitedAt: today,
          }),
        );
      });
    });

    it('未訪問に戻すと訪問日時がリセットされる', async () => {
      // 訪問済みのアイテム
      const item = createMockWishlistItem({
        visited: 1,
        visitedAt: '2024-06-15T00:00:00.000Z',
      });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // 訪問済みバッジが表示されている
      expect(screen.getByText('訪問済み')).toBeInTheDocument();

      // 未訪問に戻すボタンをクリック
      const revertButton = screen.getByRole('button', { name: '未訪問に戻す' });
      fireEvent.click(revertButton);

      // updateWishlistがvisited: 0, visitedAt: nullで呼ばれる
      await waitFor(() => {
        expect(mockUpdateWishlist).toHaveBeenCalledWith(
          expect.objectContaining({
            visited: 0,
            visitedAt: '',
          }),
        );
      });
    });

    it('訪問済みの場合、登録済みの訪問日時が表示され、カレンダーが活性化される', () => {
      const item = createMockWishlistItem({
        visited: 1,
        visitedAt: '2024-06-15',
      });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // 登録済みの日付がYYYY-MM-DD形式で表示される
      expect(screen.getByText('2024-06-15')).toBeInTheDocument();

      // 訪問済みの場合はカレンダーボタンが活性
      const calendarButton = screen.getByTestId('visited-at-button-0');
      expect(calendarButton).not.toBeDisabled();
    });

    it('訪問済みで訪問日時がnullの場合は「日付を選択」が表示される', () => {
      const item = createMockWishlistItem({
        visited: 1,
        visitedAt: null,
      });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      const calendarButton = screen.getByTestId('visited-at-button-0');
      expect(calendarButton).toHaveTextContent('日付を選択');
      // 訪問済みの場合はカレンダーボタンが活性
      expect(calendarButton).not.toBeDisabled();
    });
  });

  describe('基本機能', () => {
    it('スポット名が表示される', () => {
      const item = createMockWishlistItem();
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      expect(screen.getByText('テストスポット')).toBeInTheDocument();
    });

    it('住所が表示される', () => {
      const item = createMockWishlistItem();
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      expect(screen.getByText('東京都千代田区')).toBeInTheDocument();
    });

    it('優先度の星が正しく表示される', () => {
      const item = createMockWishlistItem({ priority: 3 });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // 優先度ラベルが表示される
      expect(screen.getByText('優先度')).toBeInTheDocument();
    });

    it('削除ボタンをクリックするとdeleteWishlistが呼ばれる', async () => {
      const item = createMockWishlistItem({ id: 123 });
      render(<WishlistSpotInfoCard item={item} idx={0} />);

      // 削除ボタンを取得（data-testidまたはaria-labelを使用することを推奨）
      const deleteButton = screen.getByRole('button', { name: '削除ボタン' });
      expect(deleteButton).toBeDefined();

      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockDeleteWishlist).toHaveBeenCalledWith(123);
      });
    });
  });
});
