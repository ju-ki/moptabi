import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// .env.local を優先的に読み込む（Drizzle用のNeon直接接続URL）
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
