import { z } from '@hono/zod-openapi';

/**
 * ページネーション情報スキーマ
 */
export const PaginationInfoSchema = z
  .object({
    currentPage: z.number().int().positive().openapi({ description: '現在のページ番号', example: 1 }),
    totalPages: z.number().int().nonnegative().openapi({ description: '総ページ数', example: 5 }),
    totalCount: z.number().int().nonnegative().openapi({ description: '総件数', example: 100 }),
    limit: z.number().int().positive().openapi({ description: '1ページあたりの件数', example: 20 }),
    hasNextPage: z.boolean().openapi({ description: '次のページがあるか', example: true }),
    hasPrevPage: z.boolean().openapi({ description: '前のページがあるか', example: false }),
  })
  .openapi('PaginationInfo');

/**
 * ページネーションクエリパラメータスキーマ（共通）
 */
export const PaginationQuerySchema = z.object({
  page: z
    .union([z.string(), z.undefined()])
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive())
    .openapi({
      description: 'ページ番号（1始まり）',
      example: '1',
    }),
  limit: z
    .union([z.string(), z.undefined()])
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100))
    .openapi({
      description: '1ページあたりの件数',
      example: '20',
    }),
});

/**
 * ソート順スキーマ
 */
export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc').openapi({
  description: 'ソート順',
  example: 'desc',
});

// 型エクスポート
export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * ページネーション情報を計算するユーティリティ関数
 */
export function calculatePagination(totalCount: number, page: number, limit: number): PaginationInfo {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    currentPage: page,
    totalPages,
    totalCount,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
