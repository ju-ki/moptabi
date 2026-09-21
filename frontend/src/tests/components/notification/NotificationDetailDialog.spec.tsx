import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import NotificationDetailDialog from '@/components/NotificationDetailDialog';
import { NotificationItem } from '@/models/notification';

// Dialog コンポーネントをモック化
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: any) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

describe('NotificationDetailDialog コンポーネント', () => {
  const mockNotification: NotificationItem = {
    id: 1,
    title: 'テストお知らせ',
    content: 'これはテストお知らせの内容です。\n複数行の内容をサポートしています。',
    type: 'SYSTEM' as const,
    publishedAt: '2025-09-20T05:30:00Z',
    createdAt: '2025-09-20T05:00:00Z',
    isRead: false,
    readAt: null,
  };

  const mockOnClose = vi.fn();
  const mockOnNotificationView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('ダイアログが閉じている場合は何も表示されない', () => {
      render(
        <NotificationDetailDialog
          isOpen={false}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const title = screen.queryByText('テストお知らせ');
      expect(title).not.toBeInTheDocument();
    });

    it('ダイアログが開いている場合はタイトルが表示される', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const title = screen.getByText('テストお知らせ');
      expect(title).toBeInTheDocument();
    });

    it('お知らせの本文が表示される', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('これはテストお知らせの内容です。');
    });

    it('公開日時がフォーマットされて表示される', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const publishedDate = screen.getByTestId('published-date');
      expect(publishedDate).toHaveTextContent('9月20日 14:30');
    });
  });

  describe('既読表示', () => {
    it('未読のお知らせの場合は青いバッジが表示される', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={{ ...mockNotification, isRead: false }}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const badge = screen.getByTestId('unread-indicator');
      expect(badge).toBeInTheDocument();
    });

    it('既読のお知らせの場合はバッジが表示されない', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={{ ...mockNotification, isRead: true }}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const badge = screen.queryByTestId('unread-indicator');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('自動既読機能', () => {
    it('ダイアログが開くと未読のお知らせが自動的に既読になる', () => {
      const { rerender } = render(
        <NotificationDetailDialog
          isOpen={false}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      expect(mockOnNotificationView).not.toHaveBeenCalled();

      rerender(
        <NotificationDetailDialog
          isOpen={true}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      expect(mockOnNotificationView).toHaveBeenCalledWith(mockNotification.id);
    });

    it('既読のお知らせが表示されても既読コールバックは呼ばれない', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={{ ...mockNotification, isRead: true }}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      expect(mockOnNotificationView).not.toHaveBeenCalled();
    });

    it('onNotificationViewが提供されていない場合はエラーが出ない', () => {
      render(<NotificationDetailDialog isOpen={true} notification={mockNotification} onClose={mockOnClose} />);

      // エラーが出ずにレンダリングされることを確認
      const title = screen.getByText('テストお知らせ');
      expect(title).toBeInTheDocument();
    });
  });

  describe('ユーザーインタラクション', () => {
    it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
      const user = userEvent.setup();

      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const closeButton = screen.getByTestId('close-button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('フッターの「閉じる」ボタンをクリックするとonCloseが呼ばれる', async () => {
      const user = userEvent.setup();

      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={mockNotification}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const footerCloseButton = screen.getByRole('button', { name: '閉じる' });
      await user.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('notificationがnullの場合は何も表示されない', () => {
      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={null}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const title = screen.queryByText('テストお知らせ');
      expect(title).not.toBeInTheDocument();
    });

    it('contentに改行を含む長いテキストが正しくレンダリングされる', () => {
      const longContent = '行1\n行2\n行3\n行4\n行5';

      render(
        <NotificationDetailDialog
          isOpen={true}
          notification={{ ...mockNotification, content: longContent }}
          onClose={mockOnClose}
          onNotificationView={mockOnNotificationView}
        />,
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveTextContent('行1');
      expect(content).toHaveTextContent('行5');
    });
  });
});
