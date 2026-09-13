import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: process.env.CI ? 120000 : 30000,
  expect: {timeout: process.env.CI ? 15000 : 5000},
  use: {
    baseURL: "http://127.0.0.1:4176",
    channel: "chrome",
    launchOptions: process.env.CI ? {args:["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]} : {},
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: !process.env.CI,
  },
});
