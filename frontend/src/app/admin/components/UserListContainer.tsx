'use client';

import { useState } from 'react';
import { Search, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationInfo } from '@/components/common/Pagination';

type RoleType = 'ADMIN' | 'USER' | 'GUEST';
type UserSortBy = 'lastLoginAt' | 'registeredAt' | 'planCount' | 'wishlistCount';
type SortOrder = 'asc' | 'desc';

interface User {
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

interface UserListContainerProps {
  users: User[];
  pagination?: PaginationInfo;
  sortBy: UserSortBy;
  sortOrder: SortOrder;
  isLoading: boolean;
  currentSearch: string;
  onSortChange: (sortBy: UserSortBy, sortOrder: SortOrder) => void;
  onPageChange: (page: number) => void;
  onSearchExecute: (search: string) => void;
}

/**
 * タイムスタンプを日付文字列にフォーマット
 */
const formatDate = (timestamp: number | null): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const SORT_OPTIONS: { value: UserSortBy; label: string }[] = [
  { value: 'lastLoginAt', label: '最終ログイン' },
  { value: 'registeredAt', label: '登録日時' },
  { value: 'planCount', label: 'プラン数' },
  { value: 'wishlistCount', label: '行きたいリスト数' },
];

/**
 * ユーザーリストテーブル部分（ローディング対応）
 * リスト部分のみをローディング表示するためのサブコンポーネント
 */
function UserListTable({ users, isLoading }: { users: User[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">登録ユーザー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">登録ユーザー</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">ユーザーID</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">ユーザー名</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">登録日時</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">最終ログイン</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">プラン数</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">行きたいリスト</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{user.id.substring(0, 15)}...</code>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">
                        {user.lastName} {user.firstName}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email?.emailAddress}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm" data-testid={`registered-at-${user.id}`}>
                    {formatDate(user.registeredAt)}
                  </td>
                  <td className="py-3 px-4 text-sm">{formatDate(user.lastLoginAt)}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" data-testid={`plan-count-${user.id}`}>
                      {user.planCount ?? 0}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" data-testid={`wishlist-count-${user.id}`}>
                      {user.wishlistCount ?? 0}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={user.role === 'GUEST' ? 'default' : 'secondary'}>{user.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">該当するユーザーが見つかりません</div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ユーザー一覧コンテナコンポーネント
 * 検索フォームとリストテーブルを分離し、リスト部分のみがローディング状態を表示
 * 検索はonBlurで実行
 */
export function UserListContainer({
  users,
  pagination,
  sortBy,
  sortOrder,
  isLoading,
  currentSearch,
  onSortChange,
  onPageChange,
  onSearchExecute,
}: UserListContainerProps) {
  // ローカル検索入力値（入力中の値を保持）
  const [localSearchValue, setLocalSearchValue] = useState(currentSearch);

  const handleSortChange = (newSortBy: UserSortBy) => {
    onSortChange(newSortBy, sortOrder);
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange(sortBy, newOrder);
  };

  /**
   * onBlurで検索を実行
   */
  const handleSearchBlur = () => {
    // 値が変更された場合のみ検索実行
    if (localSearchValue !== currentSearch) {
      onSearchExecute(localSearchValue);
    }
  };

  /**
   * Enterキーでも検索を実行
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchExecute(localSearchValue);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ユーザー一覧</h2>
        <Badge variant="secondary">{pagination?.totalCount ?? users.length} 人</Badge>
      </div>

      {/* 検索とソート（常に表示、ローディング中も操作可能） */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="ユーザー名、メールアドレス、IDで検索..."
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            onBlur={handleSearchBlur}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">ソート:</span>
          <Select value={sortBy} onValueChange={(value) => handleSortChange(value as UserSortBy)}>
            <SelectTrigger className="w-40" data-testid="sort-select">
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

      {/* ユーザーテーブル（この部分だけがローディング表示） */}
      <UserListTable users={users} isLoading={isLoading} />

      {/* ページネーション */}
      {pagination && !isLoading && <Pagination pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}

export default UserListContainer;
