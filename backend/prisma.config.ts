import { defineConfig } from 'prisma/config';
import path from 'path';
import { config } from 'dotenv';

// 環境変数に応じて.envファイルを読み込む（テスト時は.env.testが既に読み込まれている）
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(__dirname, '.env') });
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: 'prisma/migrations',
  },
  schema: 'prisma/schema.prisma',
});
