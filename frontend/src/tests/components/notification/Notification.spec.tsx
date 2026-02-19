import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Notification from '@/components/Notification';

// useNotificationフックのモック
vi.mock('@/hooks/use-notification', () => ({
  useNotification: vi.fn(),
}));

import { useNotification } from '@/hooks/use-notification';

const mockUseNotification = vi.mocked(useNotification);

describe('Notification コンポーネント', () => {
  const defaultMockReturn = {
    notifications: [],
    unreadCount: 0,
    hasMoreUnread: false,
    isLoading: false,
    error: null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    mutate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotification.mockReturnValue(defaultMockReturn);
  });

  describe('基本表示', () => {
    it('通知ベルアイコンが表示される', () => {
      render(<Notification />);

      const bellButton = screen.getByRole('button');
      expect(bellButton).toBeInTheDocument();
    });

    it('未読件数が0の場合はバッジが表示されない', () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        unreadCount: 0,
      });

      render(<Notification />);

      const badge = screen.queryByTestId('unread-badge');
      expect(badge).not.toBeInTheDocument();
    });

    it('未読件数が1以上の場合はバッジが表示される', () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        unreadCount: 5,
      });

      render(<Notification />);

      const badge = screen.getByTestId('unread-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('未読件数が99を超える場合は99+と表示される', () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        unreadCount: 100,
        hasMoreUnread: true,
      });

      render(<Notification />);

      const badge = screen.getByTestId('unread-badge');
      expect(badge).toHaveTextContent('99+');
    });
  });

  describe('ドロップダウン', () => {
    it('ベルアイコンをクリックするとお知らせ一覧が表示される', async () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        notifications: [
          {
            id: 1,
            title: 'テストお知らせ',
            content: '内容',
            type: 'SYSTEM' as const,
            publishedAt: '2025-01-01T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            isRead: false,
            readAt: null,
          },
        ],
      });

      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      expect(screen.getByText('テストお知らせ')).toBeInTheDocument();
    });

    it('お知らせがない場合は「通知はありません」と表示される', async () => {
      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      expect(screen.getByText('通知はありません')).toBeInTheDocument();
    });

    it('未読のお知らせは背景色が異なる', async () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        notifications: [
          {
            id: 1,
            title: '未読お知らせ',
            content: '内容',
            type: 'SYSTEM' as const,
            publishedAt: '2025-01-01T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            isRead: false,
            readAt: null,
          },
          {
            id: 2,
            title: '既読お知らせ',
            content: '内容',
            type: 'INFO' as const,
            publishedAt: '2025-01-01T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            isRead: true,
            readAt: '2025-01-01T00:00:00Z',
          },
        ],
      });

      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      const unreadNotification = screen.getByText('未読お知らせ').closest('div');
      const readNotification = screen.getByText('既読お知らせ').closest('div');

      // 未読は青い背景を持つべき
      expect(unreadNotification?.parentElement).toHaveClass('bg-blue-50');
      // 既読は通常の背景を持つべき
      expect(readNotification?.parentElement).not.toHaveClass('bg-blue-50');
    });
  });

  describe('既読機能', () => {
    it('お知らせをクリックするとmarkAsReadが呼ばれる', async () => {
      const mockMarkAsRead = vi.fn();
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        notifications: [
          {
            id: 1,
            title: 'テストお知らせ',
            content: '内容',
            type: 'SYSTEM' as const,
            publishedAt: '2025-01-01T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            isRead: false,
            readAt: null,
          },
        ],
        markAsRead: mockMarkAsRead,
      });

      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      const notification = screen.getByTestId('notification-item-1');
      await userEvent.click(notification);

      expect(mockMarkAsRead).toHaveBeenCalledWith(1);
    });

    it('「すべて既読にする」ボタンをクリックするとmarkAllAsReadが呼ばれる', async () => {
      const mockMarkAllAsRead = vi.fn();
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        notifications: [
          {
            id: 1,
            title: 'テストお知らせ',
            content: '内容',
            type: 'SYSTEM' as const,
            publishedAt: '2025-01-01T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            isRead: false,
            readAt: null,
          },
        ],
        unreadCount: 1,
        markAllAsRead: mockMarkAllAsRead,
      });

      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      const markAllButton = screen.getByText('すべて既読にする');
      await userEvent.click(markAllButton);

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });

    it('未読がない場合は「すべて既読にする」ボタンが非表示', async () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        notifications: [
          {
            id: 1,
            title: '既読お知らせ',
            content: '内容',
            type: 'SYSTEM' as const,
            publishedAt: '2025-01-01T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            isRead: true,
            readAt: '2025-01-01T00:00:00Z',
          },
        ],
        unreadCount: 0,
      });

      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      expect(screen.queryByText('すべて既読にする')).not.toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスケルトンが表示される', async () => {
      mockUseNotification.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });

      render(<Notification />);

      const bellButton = screen.getByRole('button');
      await userEvent.click(bellButton);

      expect(screen.getByTestId('notification-loading')).toBeInTheDocument();
    });
  });
});
