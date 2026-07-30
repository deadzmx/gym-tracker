const { test, expect } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const SCREENSHOTS = join(__dirname, '..', 'screenshots');
mkdirSync(SCREENSHOTS, { recursive: true });

test('完整用户故事: 从浏览到记录训练', async ({ page }) => {
  // 1. Dashboard
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: join(SCREENSHOTS, '01-dashboard.png'), fullPage: true });
  console.log('✓ Dashboard 加载');

  // 2. 动作库
  await page.goto('/exercises');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const exerciseRows = page.locator('table tbody tr');
  await expect(exerciseRows.first()).toBeVisible({ timeout: 10000 });
  const rowCount = await exerciseRows.count();
  expect(rowCount).toBeGreaterThanOrEqual(10);
  console.log(`✓ 动作库加载了 ${rowCount} 个动作`);
  await page.screenshot({ path: join(SCREENSHOTS, '02-exercises.png'), fullPage: true });

  // 3. 计划列表
  await page.goto('/plans');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: join(SCREENSHOTS, '03-plans.png'), fullPage: true });
  console.log('✓ 计划列表加载');

  // 4. 历史
  await page.goto('/history');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: join(SCREENSHOTS, '04-history.png'), fullPage: true });
  console.log('✓ 历史加载');

  // 5. 统计
  await page.goto('/stats');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  // 等图表(SVG)渲染
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SCREENSHOTS, '05-stats.png'), fullPage: true });
  console.log('✓ 统计页加载');
});
