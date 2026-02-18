import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle-test',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
});
