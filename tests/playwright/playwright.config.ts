import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5045',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user-1',
    },
    trace: 'on-first-retry',
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'cd ../mock-server && npm install && node server.js',
        port: 5045,
        timeout: 30000,
        reuseExistingServer: !process.env.CI,
      },
});
