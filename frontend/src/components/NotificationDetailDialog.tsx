'use client';

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/models/notification';

interface NotificationDetailDialogProps {
  /**
   * ダイアログの開閉状態
   */
  isOpen: boolean;
  /**
   * 表示するお知らせ情報
   */
  notification: NotificationItem | null;
  /**
   * ダイアログを閉じるときのコールバック
   */
  onClose: () => void;
  /**
   * お知らせを既読にするときのコールバック（id を受け取る）
   */
  onNotificationView?: (id: number) => void;
}

/**
 * お知らせの詳細を表示するダイアログコンポーネント
 *
 * - ダイアログ表示時に未読の場合は自動的に既読にする
 * - タイトル・本文・公開日時を表示
 * - 画面の真ん中にセンター表示される
 *
 * @example
 * ```tsx
 * const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
 * const [isDetailOpen, setIsDetailOpen] = useState(false);
 *
 * <NotificationDetailDialog
 *   isOpen={isDetailOpen}
 *   notification={selectedNotification}
 *   onClose={() => setIsDetailOpen(false)}
 *   onNotificationView={(id) => markAsRead(id)}
 * />
 * ```
 */
export const NotificationDetailDialog: React.FC<NotificationDetailDialogProps> = ({
  isOpen,
  notification,
  onClose,
  onNotificationView,
}) => {
  /**
   * ダイアログ表示時に、未読の場合は既読にする
   */
  useEffect(() => {
    if (isOpen && notification && !notification.isRead && onNotificationView) {
      onNotificationView(notification.id);
    }
  }, [isOpen, notification, onNotificationView]);

  if (!notification) return null;

  /**
   * 公開日時をフォーマット
   * 例: "9月20日 14:30"
   */
  const formattedDate = format(new Date(notification.publishedAt), 'M月d日 HH:mm', {
    locale: ja,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle className="text-lg font-semibold">{notification.title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 p-0 ml-2" data-testid="close-button">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* 公開日時 */}
        <div className="flex items-center gap-2 px-0 mb-4">
          <span className="text-xs text-muted-foreground" data-testid="published-date">
            {formattedDate}
          </span>
          {!notification.isRead && (
            <span className="inline-block h-2 w-2 bg-blue-500 rounded-full" data-testid="unread-indicator" />
          )}
        </div>

        {/* 本文 */}
        <div className="flex-1 overflow-y-auto pr-4 pb-4">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" data-testid="content">
            {notification.content}
          </p>
        </div>

        {/* フッター */}
        <div className="flex justify-end pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose} size="sm">
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetailDialog;
