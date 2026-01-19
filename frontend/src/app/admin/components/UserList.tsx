'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

interface UserListProps {
  users: User[];
  pagination?: PaginationInfo;
  sortBy?: UserSortBy;
  sortOrder?: SortOrder;
  searchValue?: string; // 外部からの検索値
  onSortChange?: (sortBy: UserSortBy, sortOrder: SortOrder) => void;
  onPageChange?: (page: number) => void;
  onSearchChange?: (search: string) => void;
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
 * ユーザー一覧コンポーネント
 * propsで受け取ったユーザーデータを表示する純粋な表示コンポーネント
 * ページネーション、検索、ソート機能をサポート
 */
export const UserList = ({
  users,
  pagination,
  sortBy = 'lastLoginAt',
  sortOrder = 'desc',
  searchValue = '',
  onSortChange,
  onPageChange,
  onSearchChange,
}: UserListProps) => {
  // ローカルの検索値（外部から渡された値を使用、フォールバックとしてローカル状態）
  const [localSearchQuery, setLocalSearchQuery] = useState(searchValue);

  // 外部からの検索値が変更された場合、ローカル状態を同期
  useEffect(() => {
    setLocalSearchQuery(searchValue);
  }, [searchValue]);

  const userList = users ?? [];

  // クライアントサイド検索（onSearchChangeがない場合のフォールバック）
  const filteredUsers = onSearchChange
    ? userList
    : userList.filter((user) => {
        const fullName = `${user.lastName} ${user.firstName}`.toLowerCase();
        const email = user.email?.emailAddress?.toLowerCase() ?? '';
        const query = localSearchQuery.toLowerCase();

        return fullName.includes(query) || email.includes(query) || user.id.toLowerCase().includes(query);
      });

  // 検索入力ハンドラー
  // - onSearchChangeがある場合: ローカル状態のみ更新し、onBlurで親に通知
  // - onSearchChangeがない場合: ローカルでフィルタリングするため、onChange時に即座に更新
  const handleSearchInputChange = (value: string) => {
    setLocalSearchQuery(value);
  };

  const handleSearchBlur = () => {
    if (onSearchChange) {
      onSearchChange(localSearchQuery);
    }
  };

  const handleSortChange = (newSortBy: UserSortBy) => {
    if (onSortChange) {
      onSortChange(newSortBy, sortOrder);
    }
  };

  const handleSortOrderToggle = () => {
    if (onSortChange) {
      const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      onSortChange(sortBy, newOrder);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ユーザー一覧</h2>
        <Badge variant="secondary">{pagination?.totalCount ?? userList.length} 人</Badge>
      </div>

      {/* 検索とソート */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="ユーザー名、メールアドレス、IDで検索..."
            value={localSearchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onBlur={handleSearchBlur}
            className="pl-10"
          />
        </div>

        {onSortChange && (
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
        )}
      </div>

      {/* ユーザーテーブル */}
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
                {filteredUsers.map((user) => (
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

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">該当するユーザーが見つかりません</div>
          )}
        </CardContent>
      </Card>

      {/* ページネーション */}
      {pagination && onPageChange && <Pagination pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
};

export default UserList;
