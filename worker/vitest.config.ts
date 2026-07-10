import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

function requiredTestBinding(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'SESSION_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set by the test command`);
  return value;
}

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(fileURLToPath(new URL('./migrations', import.meta.url))),
          APP_ORIGIN: 'http://localhost:5173',
          APP_RETURN_URL: 'http://localhost:5173/',
          ENVIRONMENT: 'test',
          GOOGLE_CLIENT_ID: requiredTestBinding('GOOGLE_CLIENT_ID'),
          GOOGLE_CLIENT_SECRET: requiredTestBinding('GOOGLE_CLIENT_SECRET'),
          SESSION_SECRET: requiredTestBinding('SESSION_SECRET'),
        },
      },
    })),
  ],
  test: {
    setupFiles: ['./worker/tests/applyMigrations.ts'],
    include: ['./worker/tests/**/*.test.ts'],
  },
});
