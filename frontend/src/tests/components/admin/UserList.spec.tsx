/**
 * UserListコンポーネントのテスト
 *
 * 画面設計書に基づく要件:
 * - ユーザー一覧の表示
 * - ユーザーID、名前、メール、登録日時、最終ログイン、プラン数、行きたいリスト数、ステータスの表示
 * - 検索機能（ユーザー名、メールアドレス、IDで検索）
 * - ユーザーが見つからない場合の表示
 *
 * 注: ローディング・エラー状態はpage.tsxで管理されるため、
 * このコンポーネントは純粋な表示コンポーネントとしてテストします
 */

import '@testing-library/jest-dom';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { UserList } from '@/app/admin/components/UserList';
type RoleType = 'ADMIN' | 'USER' | 'GUEST';

// テスト用のモックユーザーデータ
interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  email: { emailAddress: string };
  imageUrl: string;
  registeredAt: number;
  lastLoginAt: number;
  role: RoleType;
  planCount: number;
  wishlistCount: number;
}

const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user_123456789',
  firstName: '太郎',
  lastName: '山田',
  email: { emailAddress: 'taro@example.com' },
  imageUrl: 'https://example.com/avatar.jpg',
  registeredAt: 1703980800000, // 2024-01-01
  lastLoginAt: 1704067200000, // 2024-01-01
  role: 'ADMIN',
  planCount: 5,
  wishlistCount: 10,
  ...overrides,
});

const mockUsers: MockUser[] = [
  createMockUser(),
  createMockUser({
    id: 'user_987654321',
    firstName: '花子',
    lastName: '佐藤',
    email: { emailAddress: 'hanako@example.com' },
    planCount: 3,
    wishlistCount: 8,
  }),
  createMockUser({
    id: 'user_inactive',
    firstName: '次郎',
    lastName: '田中',
    email: { emailAddress: 'jiro@example.com' },
    role: 'GUEST',
    planCount: 0,
    wishlistCount: 2,
  }),
];

describe('UserListコンポーネント', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('初期表示', () => {
    it('ユーザー一覧が正しく表示される', () => {
      render(<UserList users={mockUsers} />);

      // ヘッダーの確認
      expect(screen.getByText('ユーザー一覧')).toBeInTheDocument();
      expect(screen.getByText('3 人')).toBeInTheDocument();

      // テーブルヘッダーの確認
      expect(screen.getByText('ユーザーID')).toBeInTheDocument();
      expect(screen.getByText('ユーザー名')).toBeInTheDocument();
      expect(screen.getByText('登録日時')).toBeInTheDocument();
      expect(screen.getByText('最終ログイン')).toBeInTheDocument();
      expect(screen.getByText('プラン数')).toBeInTheDocument();
      expect(screen.getByText('行きたいリスト')).toBeInTheDocument();
      expect(screen.getByText('ステータス')).toBeInTheDocument();
    });

    it('ユーザーが0人の場合は空の状態が表示される', () => {
      render(<UserList users={[]} />);

      expect(screen.getByText('0 人')).toBeInTheDocument();
      expect(screen.getByText('該当するユーザーが見つかりません')).toBeInTheDocument();
    });

    it('usersがundefinedの場合も正しく動作する', () => {
      // @ts-expect-error: テストのためにundefinedを渡す
      render(<UserList users={undefined} />);

      expect(screen.getByText('0 人')).toBeInTheDocument();
    });
  });

  describe('ユーザー情報の表示', () => {
    it('ユーザーIDが表示される（省略形式）', () => {
      render(<UserList users={mockUsers} />);

      // IDは省略表示される
      expect(screen.getByText(/user_12345678/)).toBeInTheDocument();
    });

    it('ユーザー名とメールアドレスが表示される', () => {
      render(<UserList users={mockUsers} />);

      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('taro@example.com')).toBeInTheDocument();
      expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
      expect(screen.getByText('hanako@example.com')).toBeInTheDocument();
    });

    it('プラン数と行きたいリスト数が表示される', () => {
      render(<UserList users={mockUsers} />);

      // プラン数
      expect(screen.getByTestId('plan-count-user_123456789')).toHaveTextContent('5');
      expect(screen.getByTestId('plan-count-user_987654321')).toHaveTextContent('3');

      // 行きたいリスト数
      expect(screen.getByTestId('wishlist-count-user_123456789')).toHaveTextContent('10');
      expect(screen.getByTestId('wishlist-count-user_987654321')).toHaveTextContent('8');
    });

    it('管理者は「ADMIN」バッジが表示される', () => {
      render(<UserList users={mockUsers} />);

      const activeBadges = screen.getAllByText('ADMIN');
      expect(activeBadges.length).toBe(2);
    });

    it('ゲストは「GUEST」バッジが表示される', () => {
      render(<UserList users={mockUsers} />);

      expect(screen.getByText('GUEST')).toBeInTheDocument();
    });
  });

  describe('検索機能', () => {
    it('検索入力欄が表示される', () => {
      render(<UserList users={mockUsers} />);

      expect(screen.getByPlaceholderText('ユーザー名、メールアドレス、IDで検索...')).toBeInTheDocument();
    });

    it('名前で検索するとフィルタリングされる', async () => {
      render(<UserList users={mockUsers} />);

      const searchInput = screen.getByPlaceholderText('ユーザー名、メールアドレス、IDで検索...');
      fireEvent.change(searchInput, { target: { value: '山田' } });

      await waitFor(() => {
        expect(screen.getByText('山田 太郎')).toBeInTheDocument();
        expect(screen.queryByText('佐藤 花子')).not.toBeInTheDocument();
      });
    });

    it('メールアドレスで検索するとフィルタリングされる', async () => {
      render(<UserList users={mockUsers} />);

      const searchInput = screen.getByPlaceholderText('ユーザー名、メールアドレス、IDで検索...');
      fireEvent.change(searchInput, { target: { value: 'hanako@' } });

      await waitFor(() => {
        expect(screen.queryByText('山田 太郎')).not.toBeInTheDocument();
        expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
      });
    });

    it('IDで検索するとフィルタリングされる', async () => {
      render(<UserList users={mockUsers} />);

      const searchInput = screen.getByPlaceholderText('ユーザー名、メールアドレス、IDで検索...');
      fireEvent.change(searchInput, { target: { value: 'user_987654321' } });

      await waitFor(() => {
        expect(screen.queryByText('山田 太郎')).not.toBeInTheDocument();
        expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
      });
    });

    it('検索結果が0件の場合はメッセージが表示される', async () => {
      render(<UserList users={mockUsers} />);

      const searchInput = screen.getByPlaceholderText('ユーザー名、メールアドレス、IDで検索...');
      fireEvent.change(searchInput, { target: { value: '存在しないユーザー' } });

      await waitFor(() => {
        expect(screen.getByText('該当するユーザーが見つかりません')).toBeInTheDocument();
      });
    });

    it('大文字小文字を区別せずに検索できる', async () => {
      render(<UserList users={mockUsers} />);

      const searchInput = screen.getByPlaceholderText('ユーザー名、メールアドレス、IDで検索...');
      fireEvent.change(searchInput, { target: { value: 'TARO@EXAMPLE.COM' } });

      await waitFor(() => {
        expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      });
    });
  });

  describe('日付フォーマット', () => {
    it('登録日時が適切なフォーマットで表示される', () => {
      render(<UserList users={[createMockUser({ registeredAt: 1703980800000 })]} />);

      // 日付フォーマットの確認（yyyy/MM/dd HH:mm形式）
      expect(screen.getByTestId('registered-at-user_123456789')).toBeInTheDocument();
    });

    it('登録日時がnullの場合は「-」が表示される', () => {
      // @ts-expect-error: テストのためにnullを渡す
      render(<UserList users={[createMockUser({ registeredAt: null })]} />);

      expect(screen.getByTestId('registered-at-user_123456789')).toHaveTextContent('-');
    });
  });

  describe('ソート機能', () => {
    const mockOnSortChange = vi.fn();
    const mockPagination = {
      currentPage: 1,
      totalPages: 1,
      totalCount: 3,
      limit: 20,
      hasNextPage: false,
      hasPrevPage: false,
    };

    it('ソートセレクターが表示される', () => {
      render(
        <UserList
          users={mockUsers}
          pagination={mockPagination}
          sortBy="lastLoginAt"
          sortOrder="desc"
          onSortChange={mockOnSortChange}
          onPageChange={vi.fn()}
        />,
      );

      expect(screen.getByTestId('sort-select')).toBeInTheDocument();
      expect(screen.getByTestId('sort-order-toggle')).toBeInTheDocument();
    });

    it('ソート項目を変更するとonSortChangeが呼ばれる', async () => {
      render(
        <UserList
          users={mockUsers}
          pagination={mockPagination}
          sortBy="lastLoginAt"
          sortOrder="desc"
          onSortChange={mockOnSortChange}
          onPageChange={vi.fn()}
        />,
      );

      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.click(sortSelect);

      await waitFor(() => {
        const planCountOption = screen.getByRole('option', { name: 'プラン数' });
        fireEvent.click(planCountOption);
      });

      expect(mockOnSortChange).toHaveBeenCalled();
    });

    it('ソート順を切り替えるとonSortChangeが呼ばれる', () => {
      render(
        <UserList
          users={mockUsers}
          pagination={mockPagination}
          sortBy="lastLoginAt"
          sortOrder="desc"
          onSortChange={mockOnSortChange}
          onPageChange={vi.fn()}
        />,
      );

      const sortOrderToggle = screen.getByTestId('sort-order-toggle');
      fireEvent.click(sortOrderToggle);

      expect(mockOnSortChange).toHaveBeenCalledWith('lastLoginAt', 'asc');
    });
  });

  describe('ページネーション機能', () => {
    const mockOnPageChange = vi.fn();
    const mockOnSortChange = vi.fn();

    const paginationWith2Pages = {
      currentPage: 1,
      totalPages: 2,
      totalCount: 25,
      limit: 20,
      hasNextPage: true,
      hasPrevPage: false,
    };

    it('ページネーションが表示される', () => {
      render(
        <UserList
          users={mockUsers}
          pagination={paginationWith2Pages}
          sortBy="lastLoginAt"
          sortOrder="desc"
          onSortChange={mockOnSortChange}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('ページを変更するとonPageChangeが呼ばれる', () => {
      render(
        <UserList
          users={mockUsers}
          pagination={paginationWith2Pages}
          sortBy="lastLoginAt"
          sortOrder="desc"
          onSortChange={mockOnSortChange}
          onPageChange={mockOnPageChange}
        />,
      );

      const nextButton = screen.getByTestId('pagination-next');
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('ページネーションが1ページ以下の場合は表示されない', () => {
      const singlePagePagination = {
        currentPage: 1,
        totalPages: 1,
        totalCount: 3,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
      };

      render(
        <UserList
          users={mockUsers}
          pagination={singlePagePagination}
          sortBy="lastLoginAt"
          sortOrder="desc"
          onSortChange={mockOnSortChange}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });
  });
});
