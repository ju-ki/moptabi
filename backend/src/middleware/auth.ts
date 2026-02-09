import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * 認証ミドルウェア
 * フロントエンドから送られてくるX-User-Idヘッダーを検証
 * ログインしているユーザーのみAPIアクセスを許可
 */
export const requireAuth = async (c: Context, next: Next) => {
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    throw new HTTPException(401, { message: '認証が必要です' });
  }

  // ユーザーIDをコンテキストに保存
  c.set('userId', userId);

  await next();
};

/**
 * オプショナル認証ミドルウェア
 * ユーザーIDがあれば保存するが、なくてもエラーにしない
 */
export const optionalAuth = async (c: Context, next: Next) => {
  const userId = c.req.header('X-User-Id');

  if (userId) {
    c.set('userId', userId);
  }

  await next();
};

/**
 * コンテキストからユーザーIDを取得するヘルパー関数
 * サービス層で使用
 * @param c Honoコンテキスト
 * @returns ユーザーID
 * @throws 認証エラー時にHTTPException(401)
 */
export function getUserId(c: Context): string {
  const userId = c.get('userId') as string | undefined;
  if (!userId) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  return userId;
}

/**
 * コンテキストからユーザーIDを取得（オプショナル）
 * @param c Honoコンテキスト
 * @returns ユーザーID または undefined
 */
export function getOptionalUserId(c: Context): string | undefined {
  return c.get('userId') as string | undefined;
}
