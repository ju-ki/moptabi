/**
 * テスト用DBリセットスクリプト
 *
 * テスト環境のデータベースを完全にリセットし、最新のスキーマを適用します。
 * 開発中にスキーマが変更された場合や、テスト環境とスキーマの不整合が発生した場合に使用します。
 *
 * 使用方法:
 *   bun run db:reset:test
 *
 * 処理内容:
 *   1. テスト用DBの全テーブルとENUMタイプをドロップ
 *   2. drizzle-kit push でスキーマを再適用
 */
import { execSync } from 'child_process';

import { config } from 'dotenv';
import { Client } from 'pg';

// .env.test を読み込む
config({ path: '.env.test', override: true });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://travel_user_test:travel_admin_test@localhost:5433/ai_travel_test?uselibpqcompat=true&sslmode=require';

/**
 * 全テーブルとENUMタイプをドロップするSQL
 * CASCADEオプションで外部キー制約も含めて削除
 */
const DROP_ALL_OBJECTS_SQL = `
-- 全テーブルをドロップ (publicスキーマ内、CASCADEで依存関係も削除)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public."' || r.tablename || '" CASCADE';
    END LOOP;
END $$;

-- 全ENUMタイプをドロップ
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public."' || r.typname || '" CASCADE';
    END LOOP;
END $$;

-- 全シーケンスをドロップ
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public."' || r.sequencename || '" CASCADE';
    END LOOP;
END $$;
`;

async function resetTestDatabase(): Promise<void> {
  console.log('🔄 テスト用DBのリセットを開始します...\n');

  // SSLモードをdisableに設定（ローカルDockerコンテナ接続用）
  const connectionString = DATABASE_URL.includes('sslmode=')
    ? DATABASE_URL
    : `${DATABASE_URL}${DATABASE_URL.includes('?') ? '&' : '?'}sslmode=disable`;

  const client = new Client({ connectionString });

  try {
    // Step 1: DB接続
    console.log('📡 データベースに接続中...');
    await client.connect();
    console.log('✅ 接続成功\n');

    // Step 2: 全テーブルとENUMタイプをドロップ
    console.log('🗑️  全テーブルとENUMタイプを削除中...');
    await client.query(DROP_ALL_OBJECTS_SQL);
    console.log('✅ 削除完了\n');

    // Step 3: 現在のテーブル数を確認
    const result = await client.query(`
      SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);
    console.log(`📊 残りテーブル数: ${result.rows[0].count}\n`);

    await client.end();

    // Step 4: drizzle-kit push でスキーマを再適用
    console.log('🔧 drizzle-kit push でスキーマを適用中...');
    console.log('   (この処理には数秒かかる場合があります)\n');

    try {
      execSync('bun run drizzle-kit push --config=./drizzle-test.config.ts --force', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: connectionString,
        },
      });
      console.log('\n✅ スキーマ適用完了');
    } catch (pushError) {
      console.error('\n⚠️  drizzle-kit push でエラーが発生しました');
      console.error('   手動で確認してください: bun run db:push:test');
      throw pushError;
    }

    console.log('\n🎉 テスト用DBのリセットが完了しました！');
    console.log('   テストを実行できます: bun run test');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', (error as Error).message);
    process.exit(1);
  }
}

// スクリプト実行
resetTestDatabase();
