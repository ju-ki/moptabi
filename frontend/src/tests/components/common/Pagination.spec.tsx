import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pagination, PaginationInfo } from '@/components/common/Pagination';

describe('Paginationコンポーネント', () => {
  const mockOnPageChange = vi.fn();

  const defaultPagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 5,
    totalCount: 100,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false,
  };

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  describe('表示テスト', () => {
    it('ページネーション情報が正しく表示される', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId('pagination-info')).toHaveTextContent('全100件中 1-20件を表示');
    });

    it('ページ番号ボタンが表示される', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId('pagination-page-1')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-page-2')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-page-3')).toBeInTheDocument();
    });

    it('現在のページがハイライトされる', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      const currentPageButton = screen.getByTestId('pagination-page-1');
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    it('総件数表示を非表示にできる', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} showTotalCount={false} />);

      expect(screen.queryByTestId('pagination-info')).not.toBeInTheDocument();
    });
  });

  describe('ナビゲーションボタンテスト', () => {
    it('最初のページでは前へボタンが無効になる', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId('pagination-first')).toBeDisabled();
      expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    });

    it('最後のページでは次へボタンが無効になる', () => {
      const lastPagePagination: PaginationInfo = {
        ...defaultPagination,
        currentPage: 5,
        hasNextPage: false,
        hasPrevPage: true,
      };

      render(<Pagination pagination={lastPagePagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId('pagination-next')).toBeDisabled();
      expect(screen.getByTestId('pagination-last')).toBeDisabled();
    });

    it('中間ページでは全てのナビゲーションボタンが有効', () => {
      const middlePagePagination: PaginationInfo = {
        ...defaultPagination,
        currentPage: 3,
        hasNextPage: true,
        hasPrevPage: true,
      };

      render(<Pagination pagination={middlePagePagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId('pagination-first')).not.toBeDisabled();
      expect(screen.getByTestId('pagination-prev')).not.toBeDisabled();
      expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
      expect(screen.getByTestId('pagination-last')).not.toBeDisabled();
    });
  });

  describe('クリックイベントテスト', () => {
    it('ページ番号をクリックするとonPageChangeが呼ばれる', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByTestId('pagination-page-3'));

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('次へボタンをクリックするとonPageChangeが呼ばれる', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByTestId('pagination-next'));

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('前へボタンをクリックするとonPageChangeが呼ばれる', () => {
      const middlePagePagination: PaginationInfo = {
        ...defaultPagination,
        currentPage: 3,
        hasNextPage: true,
        hasPrevPage: true,
      };

      render(<Pagination pagination={middlePagePagination} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByTestId('pagination-prev'));

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('最初へボタンをクリックするとonPageChangeが呼ばれる', () => {
      const middlePagePagination: PaginationInfo = {
        ...defaultPagination,
        currentPage: 3,
        hasNextPage: true,
        hasPrevPage: true,
      };

      render(<Pagination pagination={middlePagePagination} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByTestId('pagination-first'));

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('最後へボタンをクリックするとonPageChangeが呼ばれる', () => {
      render(<Pagination pagination={defaultPagination} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByTestId('pagination-last'));

      expect(mockOnPageChange).toHaveBeenCalledWith(5);
    });
  });

  describe('境界条件テスト', () => {
    it('総ページ数が1以下の場合は何も表示しない', () => {
      const singlePagePagination: PaginationInfo = {
        currentPage: 1,
        totalPages: 1,
        totalCount: 10,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
      };

      render(<Pagination pagination={singlePagePagination} onPageChange={mockOnPageChange} />);

      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    it('多数のページがある場合は省略記号が表示される', () => {
      const manyPagesPagination: PaginationInfo = {
        currentPage: 5,
        totalPages: 20,
        totalCount: 400,
        limit: 20,
        hasNextPage: true,
        hasPrevPage: true,
      };

      render(<Pagination pagination={manyPagesPagination} onPageChange={mockOnPageChange} />);

      // 省略記号の存在を確認
      const ellipsis = screen.getAllByText('...');
      expect(ellipsis.length).toBeGreaterThan(0);
    });
  });
});
