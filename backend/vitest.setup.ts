import { afterEach, beforeAll, afterAll } from 'vitest';

// グローバルのテストセットアップ
beforeAll(() => {
  // テスト全体の前に1回実行される
  console.log('Bun test start');
});

afterEach(() => {
  // 各テストの後に実行される
});

afterAll(() => {
  // テスト全体の後に1回実行される
  console.log('Bun test end');
});
