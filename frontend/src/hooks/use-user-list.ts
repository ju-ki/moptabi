import useSWR from 'swr';
import { useState, useCallback, useMemo } from 'react';

import { PaginationInfo } from '@/components/common/Pagination';

import { useFetcher } from './use-fetcher';

// APIから取得するユーザーの型定義
export type RoleType = 'ADMIN' | 'USER' | 'GUEST';
export type UserSortBy = 'lastLoginAt' | 'registeredAt' | 'planCount' | 'wishlistCount';
export type SortOrder = 'asc' | 'desc';

export interface User {
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

// ユーザーリストAPIレスポンス
interface UserListResponse {
  users: User[];
  pagination: PaginationInfo;
}

// ユーザーリストクエリパラメータ
export interface UserListQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: UserSortBy;
  sortOrder: SortOrder;
}

/**
 * クエリパラメータをURLに変換するヘルパー関数
 */
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * ユーザーリスト専用のカスタムフック
 * リスト部分のみでデータフェッチとローディング状態を管理
 */
export function useUserList() {
  const { getFetcher } = useFetcher();

  // APIクエリ状態（実際にAPIリクエストに使用される）
  const [query, setQuery] = useState<UserListQuery>({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'lastLoginAt',
    sortOrder: 'desc',
  });

  // URLを動的に生成
  const userListUrl = useMemo(() => {
    const queryString = buildQueryString({
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/list${queryString}`;
  }, [query]);

  const { data, error, isLoading } = useSWR<UserListResponse>(userListUrl, getFetcher);

  // ハンドラー
  const handlePageChange = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  /**
   * 検索を実行（onBlurで呼び出す）
   */
  const executeSearch = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const handleSortChange = useCallback((sortBy: UserSortBy, sortOrder: SortOrder) => {
    setQuery((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  return {
    users: data?.users || [],
    pagination: data?.pagination,
    query,
    isLoading,
    error,
    handlePageChange,
    executeSearch,
    handleSortChange,
  };
}
