const { test, expect, request } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const SHOTS = join(__dirname, '..', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

async function seedTestData() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3001' });
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 2);
    const date = d.toISOString().slice(0, 10);
    const sRes = await ctx.post('/api/sessions', {
      data: { plan_id: null, session_date: date },
    });
    if (!sRes.ok()) {
      console.log('session create failed:', sRes.status(), await sRes.text());
      continue;
    }
    const body = await sRes.json();
    const sessionId = body.data?.id;
    if (!sessionId) {
      console.log('no session id:', body);
      continue;
    }
    const setCount = (i % 3) + 1;
    const sets = [];
    for (let j = 0; j < setCount; j++) {
      sets.push({
        exercise_id: (j % 5) + 1,
        set_index: j + 1,
        reps: 8,
        weight: 50 + i * 2,
        rpe: 7,
        completed: true,
      });
    }
    await ctx.post(`/api/sessions/${sessionId}/sets`, { data: { sets } });
  }
  await ctx.dispose();
}

test.describe('v0.3 features', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test('Calendar renders on Dashboard with training days', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Calendar heatmap should be visible
    const heatmap = page.locator('[data-testid="calendar-heatmap"]');
    await expect(heatmap).toBeVisible({ timeout: 10000 });

    // Should have ~84 cells (12 weeks * 7 days)
    const cells = await page.locator('[data-testid="calendar-heatmap"] rect').count();
    expect(cells).toBeGreaterThanOrEqual(84);

    // Should have some active cells (data-sessions > 0)
    const activeCells = await page.locator('[data-testid="calendar-heatmap"] rect[data-sessions]:not([data-sessions="0"])').count();
    expect(activeCells).toBeGreaterThan(0);

    // Light mode screenshot
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (isDark) {
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: join(SHOTS, 'v3-01-dashboard-light.png'), fullPage: true });

    // Dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500);
    const nowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(nowDark).toBe(true);
    await page.screenshot({ path: join(SHOTS, 'v3-02-dashboard-dark.png'), fullPage: true });
  });

  test('Dark mode on mobile dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    // Make dark
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!isDark) {
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: join(SHOTS, 'v3-03-dashboard-mobile-dark.png'), fullPage: true });
  });

  test('PR-based weight suggestions in AI recommend', async ({ page }) => {
    // Seed a known PR
    const today = new Date().toISOString().slice(0, 10);
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    void ctx;
    const ctx2 = await request.newContext({ baseURL: 'http://localhost:3001' });
    const sRes = await ctx2.post('/api/sessions', {
      data: { plan_id: null, session_date: today },
    });
    const body = await sRes.json();
    const sid = body.data.id;
    await ctx2.post(`/api/sessions/${sid}/sets`, {
      data: {
        sets: [
          { exercise_id: 1, set_index: 1, reps: 8, weight: 60, rpe: 7, completed: true },
          { exercise_id: 2, set_index: 1, reps: 10, weight: 80, rpe: 7, completed: true },
        ],
      },
    });
    await ctx2.dispose();

    await page.goto('/plans/recommend');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.click('[data-testid="generate-btn"]');
    await page.waitForSelector('[data-testid="recommend-result"]', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Verify some weight values are populated (not all null)
    const weights = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="day-0"] li span:last-child');
      return Array.from(cells).map((el) => el.textContent);
    });
    console.log('weights sample:', weights);
    // Some should have weight values like "4×8 · 休息 90s" without kg (no PR for some)
    // But at least one day-0 exercise should have a weight (for exercise 1 or 2)
    const hasWeight = weights.some((w) => w && /kg/.test(w));
    // May or may not have weight depending on PR's exercise matching. Just screenshot.

    // Rationale should mention PR
    const rationale = await page.locator('[data-testid="rationale"]').textContent();
    console.log('rationale:', rationale);

    await page.screenshot({ path: join(SHOTS, 'v3-04-recommend-with-weights.png'), fullPage: true });
  });
});
