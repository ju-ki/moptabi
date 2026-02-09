import { testClient } from 'hono/testing';

import app from '..';

// テスト用ユーザーID
export const TEST_USER_ID = 'test_user_id';

/**
 * 認証ヘッダー付きのテストクライアントを作成
 */
export function createAuthHeaders(userId: string = TEST_USER_ID) {
  return {
    'X-User-Id': userId,
  };
}

/**
 * テストクライアントのインスタンスを取得
 */
export function getTestClient() {
  return testClient(app) as any;
}
