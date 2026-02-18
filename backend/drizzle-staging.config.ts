import { defineConfig } from 'drizzle-kit';

// 環境変数から DATABASE_URL を取得（コマンドライン指定またはファイルから）
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  out: './drizzle-staging',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
