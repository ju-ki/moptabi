/**
 * wishlist ページコンポーネント 単体テスト
 *
 * Phase 5 改修: ページ全体の統合テスト（タイムアウト有）を単体テストに置き換え。
 * 各コンポーネントの詳細な動作は tests/components/wishlist/ 配下の
 * ファイルで個別にカバーされているため、ここではページ固有のロジックのみを検証する。
 *
 * 削除した統合テスト（別課題管理）:
 * - ユーザーはスポット検索→結果追加→閲覧→更新までできる（30秒タイムアウト）
 * - フィルター機能テスト（ページ全体レンダリングが必要）
 * - 更新・削除機能テスト（ListView.spec.tsx で単体カバー済み）
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TravelWishlistApp from '@/app/wishlist/page';

// useFetchWishlist をモックして各テストで独立して制御する
vi.mock('@/hooks/use-wishlist', () => ({
  useFetchWishlist: vi.fn(),
}));

// useWishlistStore をモックして各テストで独立して制御する
vi.mock('@/store/wishlist/wishlistStore', () => ({
  useWishlistStore: vi.fn(),
}));

// サブコンポーネントをモック化してページ単体のロジックに集中する
// 理由: ListView/MapView/Header はそれぞれ独自のテストファイルでカバーされているため
vi.mock('@/components/wishlist/ListView', () => ({
  default: () => <div data-testid="list-view" />,
}));
vi.mock('@/components/wishlist/MapView', () => ({
  default: () => <div data-testid="map-view" />,
}));
vi.mock('@/components/wishlist/Header', () => ({
  default: () => <div data-testid="wishlist-header" />,
}));

import { useFetchWishlist } from '@/hooks/use-wishlist';
import { useWishlistStore } from '@/store/wishlist/wishlistStore';

/** テスト用のストアモックを生成するヘルパー */
const createMockStore = (
  overrides: Partial<{
    viewMode: string;
    getViewMode: () => string;
    getSortAndFilteredWishlist: () => any[];
    setWishlist: (data: any[]) => void;
  }> = {},
) => ({
  getSortAndFilteredWishlist: vi.fn().mockReturnValue([]),
  getViewMode: vi.fn().mockReturnValue('list'),
  setWishlist: vi.fn(),
  ...overrides,
});

describe('TravelWishlistApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ローディング状態', () => {
    it('データ取得中の場合ローディングUIが表示されること', () => {
      (useFetchWishlist as any).mockReturnValue({ data: undefined, isLoading: true, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore());

      render(<TravelWishlistApp />);

      expect(screen.getByTestId('mypage-loading')).toBeInTheDocument();
    });

    it('ローディング中はListViewが表示されないこと', () => {
      (useFetchWishlist as any).mockReturnValue({ data: undefined, isLoading: true, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore());

      render(<TravelWishlistApp />);

      expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('エラーが発生した場合エラーUIが表示されること', () => {
      (useFetchWishlist as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('fetch failed'),
      });
      (useWishlistStore as any).mockReturnValue(createMockStore());

      render(<TravelWishlistApp />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('エラー時はListViewが表示されないこと', () => {
      (useFetchWishlist as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('fetch failed'),
      });
      (useWishlistStore as any).mockReturnValue(createMockStore());

      render(<TravelWishlistApp />);

      expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    });
  });

  describe('データ取得後の表示', () => {
    it('データ取得完了後にヘッダーが表示されること', () => {
      (useFetchWishlist as any).mockReturnValue({ data: [], isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore());

      render(<TravelWishlistApp />);

      expect(screen.getByTestId('wishlist-header')).toBeInTheDocument();
    });

    it('viewModeがlistの場合はListViewが表示されること', () => {
      (useFetchWishlist as any).mockReturnValue({ data: [], isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore({ getViewMode: vi.fn().mockReturnValue('list') }));

      render(<TravelWishlistApp />);

      expect(screen.getByTestId('list-view')).toBeInTheDocument();
      expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
    });

    it('viewModeがmapの場合はMapViewが表示されること', () => {
      (useFetchWishlist as any).mockReturnValue({ data: [], isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore({ getViewMode: vi.fn().mockReturnValue('map') }));

      render(<TravelWishlistApp />);

      expect(screen.getByTestId('map-view')).toBeInTheDocument();
      expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    });
  });

  describe('空のウィッシュリスト', () => {
    it('ウィッシュリストが空でviewModeがlistの場合「該当するスポットがありません」が表示されること', () => {
      (useFetchWishlist as any).mockReturnValue({ data: [], isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(
        createMockStore({
          getSortAndFilteredWishlist: vi.fn().mockReturnValue([]),
          getViewMode: vi.fn().mockReturnValue('list'),
        }),
      );

      render(<TravelWishlistApp />);

      expect(screen.getByText('該当するスポットがありません')).toBeInTheDocument();
    });

    it('ウィッシュリストが空でviewModeがmapの場合「該当するスポットがありません」が表示されないこと', () => {
      (useFetchWishlist as any).mockReturnValue({ data: [], isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(
        createMockStore({
          getSortAndFilteredWishlist: vi.fn().mockReturnValue([]),
          getViewMode: vi.fn().mockReturnValue('map'),
        }),
      );

      render(<TravelWishlistApp />);

      expect(screen.queryByText('該当するスポットがありません')).not.toBeInTheDocument();
    });

    it('ウィッシュリストにデータがある場合「該当するスポットがありません」が表示されないこと', () => {
      const mockWishlist = [{ id: 1, spotId: 'spot1' }];
      (useFetchWishlist as any).mockReturnValue({ data: mockWishlist, isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(
        createMockStore({
          getSortAndFilteredWishlist: vi.fn().mockReturnValue(mockWishlist),
          getViewMode: vi.fn().mockReturnValue('list'),
        }),
      );

      render(<TravelWishlistApp />);

      expect(screen.queryByText('該当するスポットがありません')).not.toBeInTheDocument();
    });
  });

  describe('データ同期', () => {
    it('データ取得完了後にsetWishlistが呼ばれること', () => {
      const mockWishlist = [{ id: 1, spotId: 'spot1' }];
      const mockSetWishlist = vi.fn();
      (useFetchWishlist as any).mockReturnValue({ data: mockWishlist, isLoading: false, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore({ setWishlist: mockSetWishlist }));

      render(<TravelWishlistApp />);

      expect(mockSetWishlist).toHaveBeenCalledWith(mockWishlist);
    });

    it('ローディング中はsetWishlistが呼ばれないこと', () => {
      const mockSetWishlist = vi.fn();
      (useFetchWishlist as any).mockReturnValue({ data: undefined, isLoading: true, error: null });
      (useWishlistStore as any).mockReturnValue(createMockStore({ setWishlist: mockSetWishlist }));

      render(<TravelWishlistApp />);

      expect(mockSetWishlist).not.toHaveBeenCalled();
    });
  });
});
