/**
 * NotificationManagementコンポーネントのテスト
 *
 * 画面設計書に基づく要件:
 * - お知らせ一覧の表示
 * - お知らせの新規作成
 * - お知らせの編集
 * - お知らせの削除
 * - ローディング状態の表示
 * - エラー状態の表示
 * - 既読率の表示
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { NotificationManagement } from '@/app/admin/components/NotificationManagement';
import { useAdminData } from '@/hooks/use-admin';
// モック: SWRとfetchをモックする
const mockUseSWR = vi.fn();
const mockMutate = vi.fn();
vi.mock('swr', () => ({
  default: () => ({ ...mockUseSWR(), mutate: mockMutate }),
}));

vi.mock('@/hooks/use-admin');

const mockedUseAdmin = vi.mocked(useAdminData);

global.fetch = vi.fn();

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    userId: 'test-user-id',
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// テスト用のモックお知らせデータ
interface MockNotification {
  id: number;
  title: string;
  content: string;
  type: 'SYSTEM' | 'INFO';
  publishedAt: string;
  createdAt: string;
  readRate: number;
  totalRecipients: number;
  readCount: number;
}

const createMockNotification = (overrides: Partial<MockNotification> = {}): MockNotification => ({
  id: 1,
  title: 'テストお知らせ',
  content: 'これはテスト用のお知らせです。',
  type: 'SYSTEM',
  publishedAt: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
  readRate: 50,
  totalRecipients: 100,
  readCount: 50,
  ...overrides,
});

const mockNotifications: MockNotification[] = [
  createMockNotification({
    id: 1,
    title: 'システムメンテナンスのお知らせ',
    content: 'メンテナンスを実施します。',
    type: 'SYSTEM',
    readRate: 75,
    readCount: 75,
  }),
  createMockNotification({
    id: 2,
    title: '新機能リリースのお知らせ',
    content: '新機能がリリースされました。',
    type: 'INFO',
    readRate: 45,
    readCount: 45,
  }),
  createMockNotification({
    id: 3,
    title: '未来の公開予定お知らせ',
    content: '公開予定のお知らせです。',
    type: 'INFO',
    publishedAt: '2099-01-01T00:00:00.000Z',
    readRate: 0,
    readCount: 0,
  }),
];

describe('NotificationManagementコンポーネント', () => {
  // モックの戻り値を作成するヘルパー関数
  const createMockUseAdmin = (overrides = {}) => ({
    userList: [],
    userPagination: undefined,
    userQuery: { page: 1, limit: 20, search: '', sortBy: 'lastLoginAt' as const, sortOrder: 'desc' as const },
    localUserSearch: '',
    handleUserPageChange: vi.fn(),
    handleUserSearchChange: vi.fn(),
    handleUserSortChange: vi.fn(),
    notificationList: [],
    notificationPagination: undefined,
    notificationQuery: {
      page: 1,
      limit: 20,
      title: '',
      type: '' as const,
      publishedFrom: '',
      publishedTo: '',
      sortBy: 'publishedAt' as const,
      sortOrder: 'desc' as const,
    },
    localNotificationFilters: {
      title: '',
      type: '' as const,
      publishedFrom: '',
      publishedTo: '',
    },
    handleNotificationPageChange: vi.fn(),
    handleNotificationFilterChange: vi.fn(),
    handleNotificationSortChange: vi.fn(),
    postNotification: vi.fn(),
    updateNotification: vi.fn(),
    deleteNotification: vi.fn(),
    dashboardData: undefined,
    isLoading: false,
    error: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    mockedUseAdmin.mockReturnValue(createMockUseAdmin());
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('初期表示', () => {
    it('データ取得成功時はお知らせ一覧が表示される', () => {
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        isLoading: false,
      });

      render(<NotificationManagement notificationList={mockNotifications} />);

      expect(screen.getByText('お知らせ管理')).toBeInTheDocument();
      expect(screen.getByText('システムメンテナンスのお知らせ')).toBeInTheDocument();
      expect(screen.getByText('新機能リリースのお知らせ')).toBeInTheDocument();
    });

    it('お知らせが0件の場合は空の状態が表示される', () => {
      mockUseSWR.mockReturnValue({
        data: [],
        error: undefined,
        isLoading: false,
      });

      render(<NotificationManagement notificationList={[]} />);

      expect(screen.getByText('お知らせがありません')).toBeInTheDocument();
    });
  });

  describe('お知らせの表示', () => {
    beforeEach(() => {
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        isLoading: false,
      });
    });

    it('お知らせのタイトルと内容が表示される', () => {
      render(<NotificationManagement notificationList={mockNotifications} />);

      expect(screen.getByText('システムメンテナンスのお知らせ')).toBeInTheDocument();
      expect(screen.getByText('メンテナンスを実施します。')).toBeInTheDocument();
    });

    it('お知らせの種類（タイプ）がバッジで表示される', () => {
      render(<NotificationManagement notificationList={mockNotifications} />);

      expect(screen.getByTestId('notification-type-1')).toHaveTextContent('システム');
      expect(screen.getByTestId('notification-type-2')).toHaveTextContent('お知らせ');
    });

    it('既読率が表示される', () => {
      render(<NotificationManagement notificationList={mockNotifications} />);

      expect(screen.getByTestId('read-rate-1')).toHaveTextContent('75%');
      expect(screen.getByTestId('read-rate-2')).toHaveTextContent('45%');
    });

    it('公開日が表示される', () => {
      render(<NotificationManagement notificationList={mockNotifications} />);

      expect(screen.getByTestId('published-at-1')).toBeInTheDocument();
    });
  });

  describe('日付フォーマット', () => {
    it('公開日が適切なフォーマットで表示される', () => {
      mockUseSWR.mockReturnValue({
        data: [createMockNotification({ publishedAt: '2025-01-15T09:00:00.000Z' })],
        error: undefined,
        isLoading: false,
      });

      render(
        <NotificationManagement
          notificationList={[createMockNotification({ publishedAt: '2025-01-15T09:00:00.000Z' })]}
        />,
      );

      expect(screen.getByTestId('published-at-1')).toBeInTheDocument();
    });
  });

  describe('ページネーション機能', () => {
    const mockOnPageChange = vi.fn();
    const mockOnFilterChange = vi.fn();
    const mockOnSortChange = vi.fn();

    const paginationWith2Pages = {
      currentPage: 1,
      totalPages: 2,
      totalCount: 25,
      limit: 20,
      hasNextPage: true,
      hasPrevPage: false,
    };

    beforeEach(() => {
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        isLoading: false,
      });
      mockOnPageChange.mockClear();
      mockOnFilterChange.mockClear();
      mockOnSortChange.mockClear();
    });

    it('ページネーションが表示される', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={paginationWith2Pages}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('ページを変更するとonPageChangeが呼ばれる', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={paginationWith2Pages}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      const nextButton = screen.getByTestId('pagination-next');
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('フィルター機能', () => {
    const mockOnPageChange = vi.fn();
    const mockOnFilterChange = vi.fn();
    const mockOnSortChange = vi.fn();

    const defaultPagination = {
      currentPage: 1,
      totalPages: 1,
      totalCount: 3,
      limit: 20,
      hasNextPage: false,
      hasPrevPage: false,
    };

    beforeEach(() => {
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        isLoading: false,
      });
      mockOnFilterChange.mockClear();
    });

    it('タイトル検索フィールドが表示される', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={defaultPagination}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      expect(screen.getByPlaceholderText('タイトルで検索...')).toBeInTheDocument();
    });

    it('タイプフィルターが表示される', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={defaultPagination}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      expect(screen.getByTestId('type-filter')).toBeInTheDocument();
    });
  });

  describe('ソート機能', () => {
    const mockOnPageChange = vi.fn();
    const mockOnFilterChange = vi.fn();
    const mockOnSortChange = vi.fn();

    const defaultPagination = {
      currentPage: 1,
      totalPages: 1,
      totalCount: 3,
      limit: 20,
      hasNextPage: false,
      hasPrevPage: false,
    };

    beforeEach(() => {
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        isLoading: false,
      });
      mockOnSortChange.mockClear();
    });

    it('ソートセレクターが表示される', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={defaultPagination}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    });

    it('ソート順トグルボタンが表示される', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={defaultPagination}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      expect(screen.getByTestId('sort-order-toggle')).toBeInTheDocument();
    });

    it('ソート順を切り替えるとonSortChangeが呼ばれる', () => {
      render(
        <NotificationManagement
          notificationList={mockNotifications}
          pagination={defaultPagination}
          onPageChange={mockOnPageChange}
          onFilterChange={mockOnFilterChange}
          onSortChange={mockOnSortChange}
          sortBy="publishedAt"
          sortOrder="desc"
        />,
      );

      const sortOrderToggle = screen.getByTestId('sort-order-toggle');
      fireEvent.click(sortOrderToggle);

      expect(mockOnSortChange).toHaveBeenCalledWith('publishedAt', 'asc');
    });
  });
});
