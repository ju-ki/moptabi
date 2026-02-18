import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// テスト用: .env.test を読み込む
config({ path: '.env.test' });

// 環境変数から DATABASE_URL を取得（コマンドライン指定またはファイルから）
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://travel_user_test:travel_admin_test@localhost:5433/ai_travel_test';

export default defineConfig({
  out: './drizzle-test',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
