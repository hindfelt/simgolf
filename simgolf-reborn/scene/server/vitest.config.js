import {fileURLToPath} from 'node:url';
import {cloudflareTest,readD1Migrations} from '@cloudflare/vitest-pool-workers';
import {defineConfig} from 'vitest/config';
export default defineConfig({plugins:[cloudflareTest(async()=>({wrangler:{configPath:fileURLToPath(new URL('../wrangler.jsonc',import.meta.url))},miniflare:{bindings:{TEST_MIGRATIONS:await readD1Migrations(fileURLToPath(new URL('./migrations',import.meta.url))),APP_ORIGIN:'https://simgolfer.example',GOOGLE_CLIENT_ID:'google-test',GOOGLE_CLIENT_SECRET:'google-secret-test',GITHUB_CLIENT_ID:'github-test',GITHUB_CLIENT_SECRET:'github-secret-test'}}}))],test:{include:['server/**/*.test.js'],setupFiles:['server/setup-test.js']}});
