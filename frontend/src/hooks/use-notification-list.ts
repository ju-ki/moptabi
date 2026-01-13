import useSWR from 'swr';
import { useState, useCallback, useMemo } from 'react';

import { PaginationInfo } from '@/components/common/Pagination';
import { NotificationAdminType, NotificationType } from '@/models/notification';

import { useFetcher } from './use-fetcher';

export type NotificationSortBy = 'publishedAt' | 'createdAt' | 'readRate';
export type SortOrder = 'asc' | 'desc';

export interface NotificationFilter {
  title?: string;
  type?: NotificationType | '';
  publishedFrom?: string;
  publishedTo?: string;
}

// お知らせリストAPIレスポンス
interface NotificationListResponse {
  notifications: NotificationAdminType[];
  pagination: PaginationInfo;
}

// お知らせリストクエリパラメータ
export interface NotificationListQuery {
  page: number;
  limit: number;
  title?: string;
  type?: NotificationType | '';
  publishedFrom?: string;
  publishedTo?: string;
  sortBy: NotificationSortBy;
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
 * お知らせリスト専用のカスタムフック
 * リスト部分のみでデータフェッチとローディング状態を管理
 */
export function useNotificationList() {
  const { getFetcher } = useFetcher();

  // APIクエリ状態（実際にAPIリクエストに使用される）
  const [query, setQuery] = useState<NotificationListQuery>({
    page: 1,
    limit: 20,
    title: '',
    type: '',
    publishedFrom: '',
    publishedTo: '',
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });

  // URLを動的に生成
  const notificationListUrl = useMemo(() => {
    const queryString = buildQueryString({
      page: query.page,
      limit: query.limit,
      title: query.title || undefined,
      type: query.type || undefined,
      publishedFrom: query.publishedFrom || undefined,
      publishedTo: query.publishedTo || undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return `${process.env.NEXT_PUBLIC_API_BASE_URL}/notification/admin${queryString}`;
  }, [query]);

  const { data, error, isLoading, mutate } = useSWR<NotificationListResponse>(notificationListUrl, getFetcher);

  // ハンドラー
  const handlePageChange = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  /**
   * フィルターを実行（onBlurで呼び出す）
   */
  const executeFilter = useCallback((filter: NotificationFilter) => {
    setQuery((prev) => ({
      ...prev,
      title: filter.title || '',
      type: filter.type || '',
      publishedFrom: filter.publishedFrom || '',
      publishedTo: filter.publishedTo || '',
      page: 1,
    }));
  }, []);

  /**
   * 単一フィルター項目を実行（onBlurで呼び出す）
   */
  const executeSingleFilter = useCallback((key: keyof NotificationFilter, value: string) => {
    setQuery((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  }, []);

  const handleSortChange = useCallback((sortBy: NotificationSortBy, sortOrder: SortOrder) => {
    setQuery((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  return {
    notifications: data?.notifications || [],
    pagination: data?.pagination,
    query,
    isLoading,
    error,
    handlePageChange,
    executeFilter,
    executeSingleFilter,
    handleSortChange,
    mutate,
  };
}
