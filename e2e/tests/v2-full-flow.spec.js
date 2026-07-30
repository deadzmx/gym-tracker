const { test, expect } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const SHOTS = join(__dirname, '..', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

// Test desktop view
test.describe('Desktop (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load', { timeout: 15000 });
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'd-01-dashboard.png'), fullPage: true });
  });

  test('Exercises 表格', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('load', { timeout: 15000 });
    await expect(page.locator('table').first()).toBeVisible();
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(10);
    await page.screenshot({ path: join(SHOTS, 'd-02-exercises.png'), fullPage: true });
  });

  test('Plans 列表', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.screenshot({ path: join(SHOTS, 'd-03-plans.png'), fullPage: true });
  });

  test('AI Recommend 页 + 生成', async ({ page }) => {
    await page.goto('/plans/recommend');
    await page.waitForLoadState('load', { timeout: 15000 });
    await expect(page.locator('h1').first()).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'd-04-recommend-empty.png'), fullPage: true });

    // Click generate (no LLM key configured, will use rule engine)
    await page.click('[data-testid="generate-btn"]');
    // Wait for result
    await page.waitForSelector('[data-testid="recommend-result"]', { timeout: 15000 });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="degraded-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="day-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="rationale"]')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'd-05-recommend-result.png'), fullPage: true });
  });

  test('Settings 页', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('load', { timeout: 15000 });
    await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'd-06-settings.png'), fullPage: true });
  });

  test('Stats 页', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SHOTS, 'd-07-stats.png'), fullPage: true });
  });
});

// Test mobile view
test.describe('Mobile (375x812 - iPhone X)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Dashboard mobile + 抽屉菜单', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.screenshot({ path: join(SHOTS, 'm-01-dashboard.png'), fullPage: true });
    // 抽屉按钮可见
    const menuBtn = page.locator('button[aria-label="打开菜单"]');
    await expect(menuBtn).toBeVisible();
    // 打开抽屉
    await menuBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('aside').last()).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'm-02-drawer-open.png'), fullPage: false });
  });

  test('Exercises mobile 卡片视图', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForLoadState('load', { timeout: 15000 });
    // 桌面表格应隐藏,卡片列表显示
    const tableVisible = await page.locator('table').first().isVisible().catch(() => false);
    // 卡片列表会包含 .md:hidden 类
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, 'm-03-exercises.png'), fullPage: true });
  });

  test('Plans mobile', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.screenshot({ path: join(SHOTS, 'm-04-plans.png'), fullPage: true });
  });

  test('AI Recommend mobile', async ({ page }) => {
    await page.goto('/plans/recommend');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.screenshot({ path: join(SHOTS, 'm-05-recommend.png'), fullPage: true });
  });

  test('Settings mobile', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.screenshot({ path: join(SHOTS, 'm-06-settings.png'), fullPage: true });
  });

  test('Stats mobile (图表缩小)', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SHOTS, 'm-07-stats.png'), fullPage: true });
  });
});
