import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'line',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
      scale: 'css',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    viewport: { width: 1152, height: 1568 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    // PW_EXECUTABLE_PATH lets sandboxes with a pre-installed Chromium run the
    // suite without downloading the exact pinned browser build. CI leaves it unset.
    launchOptions: { args: ['--disable-gpu'], executablePath: process.env.PW_EXECUTABLE_PATH || undefined },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/?actor-atlas=1',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
