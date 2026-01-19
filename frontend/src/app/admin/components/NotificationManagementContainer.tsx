'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Info, AlertTriangle, Search, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NotificationAdminType, NotificationType, NotificationUpdate } from '@/models/notification';
import { Pagination, PaginationInfo } from '@/components/common/Pagination';

type NotificationSortBy = 'publishedAt' | 'createdAt' | 'readRate';
type SortOrder = 'asc' | 'desc';

export interface NotificationFilter {
  title?: string;
  type?: NotificationType | '';
  publishedFrom?: string;
  publishedTo?: string;
}

interface NotificationManagementContainerProps {
  notificationList: NotificationAdminType[];
  pagination?: PaginationInfo;
  sortBy: NotificationSortBy;
  sortOrder: SortOrder;
  isLoading: boolean;
  currentFilter: NotificationFilter;
  onPageChange: (page: number) => void;
  onFilterExecute: (key: keyof NotificationFilter, value: string) => void;
  onSortChange: (sortBy: NotificationSortBy, sortOrder: SortOrder) => void;
  // CRUD操作
  onCreateNotification: (data: { title: string; content: string; type: NotificationType; publishedAt: string }) => void;
  onUpdateNotification: (data: NotificationUpdate) => void;
  onDeleteNotification: (id: number) => void;
}

/**
 * 日付をフォーマットする
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const SORT_OPTIONS: { value: NotificationSortBy; label: string }[] = [
  { value: 'publishedAt', label: '公開日時' },
  { value: 'createdAt', label: '作成日時' },
  { value: 'readRate', label: '既読率' },
];

/**
 * お知らせリスト部分（ローディング対応）
 * リスト部分のみをローディング表示するためのサブコンポーネント
 */
function NotificationListContent({
  notificationList,
  isLoading,
  onEdit,
  onDelete,
  deleteConfirmId,
  setDeleteConfirmId,
}: {
  notificationList: NotificationAdminType[];
  isLoading: boolean;
  onEdit: (notification: NotificationAdminType) => void;
  onDelete: (id: number) => void;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (notificationList.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">お知らせがありません</div>;
  }

  return (
    <div className="space-y-4">
      {notificationList.map((notification) => (
        <Card key={notification.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {notification.type === 'SYSTEM' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Info className="w-5 h-5 text-blue-500" />
                )}
                <CardTitle className="text-lg">{notification.title}</CardTitle>
                <Badge
                  variant={notification.type === 'SYSTEM' ? 'destructive' : 'default'}
                  data-testid={`notification-type-${notification.id}`}
                >
                  {notification.type === 'SYSTEM' ? 'システム' : 'お知らせ'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" data-testid="edit-button" onClick={() => onEdit(notification)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Dialog
                  open={deleteConfirmId === notification.id}
                  onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(notification.id)}
                      data-testid="delete-button"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>お知らせを削除しますか？</DialogTitle>
                      <DialogDescription>この操作は取り消せません。</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                        キャンセル
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          onDelete(notification.id);
                          setDeleteConfirmId(null);
                        }}
                      >
                        削除
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{notification.content}</p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span data-testid={`published-at-${notification.id}`}>
                公開日: {formatDate(notification.publishedAt)}
              </span>
              <span data-testid={`read-rate-${notification.id}`}>
                既読: {notification.readCount} / {notification.totalRecipients} ({notification.readRate}%)
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * お知らせ管理コンテナコンポーネント
 * フィルターフォームとリスト部分を分離し、リスト部分のみがローディング状態を表示
 * タイトル検索はonBlurで実行
 */
export function NotificationManagementContainer({
  notificationList,
  pagination,
  sortBy,
  sortOrder,
  isLoading,
  currentFilter,
  onPageChange,
  onFilterExecute,
  onSortChange,
  onCreateNotification,
  onUpdateNotification,
  onDeleteNotification,
}: NotificationManagementContainerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<NotificationUpdate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ローカルフィルター値（入力中の値を保持）
  const [localTitle, setLocalTitle] = useState(currentFilter.title || '');

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'INFO' as NotificationType,
    publishedAt: new Date().toLocaleDateString('sv-SE'),
  });

  const handleSortChange = (newSortBy: NotificationSortBy) => {
    onSortChange(newSortBy, sortOrder);
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange(sortBy, newOrder);
  };

  /**
   * タイトル検索をonBlurで実行
   */
  const handleTitleBlur = () => {
    if (localTitle !== currentFilter.title) {
      onFilterExecute('title', localTitle);
    }
  };

  /**
   * Enterキーでも検索実行
   */
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onFilterExecute('title', localTitle);
    }
  };

  const handleEdit = (notification: NotificationAdminType) => {
    setEditingNotification({
      ...notification,
      publishedAt: formatDate(new Date(notification.publishedAt).toLocaleDateString('sv-SE')),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">お知らせ管理</h2>

        {/* 新規作成ダイアログ */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>お知らせを作成</DialogTitle>
              <DialogDescription>新しいお知らせを作成します。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="お知らせのタイトル"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">本文</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="お知らせの本文"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>種類</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: NotificationType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM">システム</SelectItem>
                      <SelectItem value="INFO">お知らせ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishedAt">公開日</Label>
                  <Input
                    id="publishedAt"
                    type="date"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                キャンセル
              </Button>
              <Button
                disabled={!formData.title || !formData.content}
                onClick={() => {
                  onCreateNotification(formData);
                  setFormData({
                    title: '',
                    content: '',
                    type: 'INFO',
                    publishedAt: new Date().toLocaleDateString('sv-SE'),
                  });
                  setIsCreateOpen(false);
                }}
              >
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* フィルター・ソート（常に表示、ローディング中も操作可能） */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* タイトル検索（onBlurで実行） */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="タイトルで検索..."
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="pl-10"
            />
          </div>

          {/* タイプフィルター（即時実行） */}
          <Select
            value={currentFilter.type || 'all'}
            onValueChange={(value) => onFilterExecute('type', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-40" data-testid="type-filter">
              <SelectValue placeholder="タイプ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="SYSTEM">システム</SelectItem>
              <SelectItem value="INFO">お知らせ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* 公開日範囲（即時実行） */}
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap text-sm text-muted-foreground">公開日:</Label>
            <Input
              type="date"
              value={currentFilter.publishedFrom || ''}
              onChange={(e) => onFilterExecute('publishedFrom', e.target.value)}
              className="w-36"
              data-testid="published-from"
            />
            <span className="text-muted-foreground">～</span>
            <Input
              type="date"
              value={currentFilter.publishedTo || ''}
              onChange={(e) => onFilterExecute('publishedTo', e.target.value)}
              className="w-36"
              data-testid="published-to"
            />
          </div>

          {/* ソート */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">ソート:</span>
            <Select value={sortBy} onValueChange={(value) => handleSortChange(value as NotificationSortBy)}>
              <SelectTrigger className="w-32" data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSortOrderToggle}
              data-testid="sort-order-toggle"
              aria-label={sortOrder === 'desc' ? '降順' : '昇順'}
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingNotification} onOpenChange={(open) => !open && setEditingNotification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>お知らせを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingNotification && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">タイトル</Label>
                  <Input
                    id="edit-title"
                    value={editingNotification.title || ''}
                    onChange={(e) => setEditingNotification({ ...editingNotification, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content">本文</Label>
                  <Textarea
                    id="edit-content"
                    value={editingNotification.content}
                    onChange={(e) => setEditingNotification({ ...editingNotification, content: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>種類</Label>
                    <Select
                      value={editingNotification.type}
                      onValueChange={(value: NotificationType) =>
                        setEditingNotification({ ...editingNotification, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SYSTEM">システム</SelectItem>
                        <SelectItem value="INFO">お知らせ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-publishedAt">公開日</Label>
                    <Input
                      id="edit-publishedAt"
                      type="date"
                      value={editingNotification.publishedAt}
                      onChange={(e) => setEditingNotification({ ...editingNotification, publishedAt: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingNotification(null)}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => {
                      onUpdateNotification(editingNotification);
                      setEditingNotification(null);
                    }}
                  >
                    保存
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* お知らせ一覧（この部分だけがローディング表示） */}
      <NotificationListContent
        notificationList={notificationList}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={onDeleteNotification}
        deleteConfirmId={deleteConfirmId}
        setDeleteConfirmId={setDeleteConfirmId}
      />

      {/* ページネーション */}
      {pagination && !isLoading && (
        <div className="mt-6">
          <Pagination pagination={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

export default NotificationManagementContainer;
