// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  reporter: 'list',
  use: {
    headless: true,
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // executablePath: removed — let Playwright auto-detect
        // CI uses chromium-1234 (installed via `npx playwright install --with-deps chromium`)
        // local dev uses whatever's in ~/.cache/ms-playwright/
      },
    },
  ],
});
