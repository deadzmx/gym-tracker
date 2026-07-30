const { test, expect } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const SHOTS = join(__dirname, '..', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test('dark mode toggle', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);
  // Check initial state (likely light)
  const initialDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log('initial dark:', initialDark);
  await page.screenshot({ path: join(SHOTS, 'dark-01-before.png'), fullPage: true });

  // Click theme toggle
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(500);
  const afterDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log('after dark:', afterDark);
  expect(afterDark).toBe(!initialDark);
  await page.screenshot({ path: join(SHOTS, 'dark-02-after.png'), fullPage: true });

  // Verify it persists across page navigation
  await page.goto('/exercises');
  await page.waitForLoadState('networkidle');
  const persistDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(persistDark).toBe(afterDark);
  await page.screenshot({ path: join(SHOTS, 'dark-03-exercises.png'), fullPage: true });

  // Toggle back
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(500);
  const backToLight = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(backToLight).toBe(false);
  await page.screenshot({ path: join(SHOTS, 'dark-04-back-to-light.png'), fullPage: true });
});
