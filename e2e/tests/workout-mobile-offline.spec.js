const { test, expect, request } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const SHOTS = join(__dirname, '..', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test.describe('Workout page: mobile + offline', () => {
  test.beforeAll(async ({ request: ctx }) => {
    // Create a plan with exercises
    const exercisesRes = await ctx.get('http://localhost:3001/api/exercises?category=chest');
    const exercisesJson = await exercisesRes.json();
    const ex = exercisesJson.data[0];
    const planRes = await ctx.post('http://localhost:3001/api/plans', {
      data: {
        name: 'E2E Workout 计划',
        description: '用于移动端测试',
        day_of_week: 1,
        exercises: [
          { exercise_id: ex.id, order_index: 0, target_sets: 3, target_reps: 8, target_weight: 40, rest_seconds: 60 },
        ],
      },
    });
    const planJson = await planRes.json();
    const planId = planJson.data.id;
    // Save the plan id for the test
    global.__planId = planId;
  });

  test('Desktop: big add-set button + connectivity indicator', async ({ page }) => {
    const planId = global.__planId;
    await page.goto(`/workout?plan_id=${planId}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Should show connectivity status
    const status = page.locator('[data-testid="connectivity-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('在线');

    // Add-set button should be visible
    const addBtn = page.locator('[data-testid="add-set-btn"]');
    await expect(addBtn).toBeVisible();

    // Click it to add a set
    await addBtn.click();
    await page.waitForTimeout(500);

    // Should now have a set row with input fields
    const repsInput = page.locator('input[type="number"]').first();
    await expect(repsInput).toBeVisible();

    await page.screenshot({ path: join(SHOTS, 'v3-05-workout-desktop.png'), fullPage: true });
  });

  test('Mobile: big touch buttons render properly', async ({ page }) => {
    const planId = global.__planId;
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/workout?plan_id=${planId}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Add set button should be full width on mobile
    const addBtn = page.locator('[data-testid="add-set-btn"]');
    await expect(addBtn).toBeVisible();
    const box = await addBtn.boundingBox();
    console.log('add-set button size:', box);
    // Should be at least 44px tall (mobile touch target)
    expect(box.height).toBeGreaterThanOrEqual(44);

    // Should be full-width on mobile
    expect(box.width).toBeGreaterThan(300);

    // Click to add
    await addBtn.click();
    await page.waitForTimeout(500);

    // Screenshot mobile
    await page.screenshot({ path: join(SHOTS, 'v3-06-workout-mobile.png'), fullPage: true });
  });

  test('Offline mode: connectivity indicator + sync button', async ({ page, context }) => {
    const planId = global.__planId;
    await page.goto(`/workout?plan_id=${planId}`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await page.waitForTimeout(500);

    // Status should show offline
    const status = page.locator('[data-testid="connectivity-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('离线');

    // Sync button should be disabled (no online)
    const syncBtn = page.locator('[data-testid="sync-btn"]');
    if (await syncBtn.count() > 0) {
      await expect(syncBtn).toBeDisabled();
    }

    await page.screenshot({ path: join(SHOTS, 'v3-07-workout-offline.png'), fullPage: true });

    // Restore online
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  });
});
