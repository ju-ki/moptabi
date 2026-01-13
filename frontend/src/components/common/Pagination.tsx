'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  showTotalCount?: boolean;
}

/**
 * ページネーションコンポーネント
 * 前後ナビゲーション、ページ番号表示、総件数表示を提供
 */
export const Pagination = ({ pagination, onPageChange, showTotalCount = true }: PaginationProps) => {
  const { currentPage, totalPages, totalCount, limit, hasNextPage, hasPrevPage } = pagination;

  // 表示するページ番号を計算（最大5つ）
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxPages = 5;

    if (totalPages <= maxPages) {
      // 総ページ数が5以下の場合は全て表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 現在のページを中心に表示
      let start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxPages - 1);

      // 終端に寄っている場合の調整
      if (end - start < maxPages - 1) {
        start = Math.max(1, end - maxPages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalCount);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mt-4" data-testid="pagination">
      {showTotalCount && (
        <div className="text-sm text-muted-foreground" data-testid="pagination-info">
          全{totalCount}件中 {startItem}-{endItem}件を表示
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* 最初のページへ */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          data-testid="pagination-first"
          aria-label="最初のページへ"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* 前のページへ */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          data-testid="pagination-prev"
          aria-label="前のページへ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* ページ番号 */}
        <div className="flex items-center gap-1">
          {pageNumbers[0] > 1 && <span className="px-2 text-muted-foreground">...</span>}

          {pageNumbers.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(page)}
              data-testid={`pagination-page-${page}`}
              aria-label={`${page}ページへ`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Button>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && <span className="px-2 text-muted-foreground">...</span>}
        </div>

        {/* 次のページへ */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          data-testid="pagination-next"
          aria-label="次のページへ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* 最後のページへ */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          data-testid="pagination-last"
          aria-label="最後のページへ"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
