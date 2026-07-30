const { test, expect, request } = require('@playwright/test');
const { mkdirSync } = require('fs');
const { join } = require('path');

const SHOTS = join(__dirname, '..', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

async function seedSessions() {
  const ctx = await request.newContext({ baseURL: process.env.API_URL || 'http://localhost:3001' });
  // Create 2 sessions in current month (July 2026 per our sandbox date)
  const r1 = await ctx.post('/api/sessions', {
    data: { plan_id: null, session_date: '2026-07-29' },
  });
  const r2 = await ctx.post('/api/sessions', {
    data: { plan_id: null, session_date: '2026-07-22' },
  });
  // Add a set to one of them so total_volume is non-null
  const body1 = await r1.json();
  const sid1 = body1.data.id;
  await ctx.post(`/api/sessions/${sid1}/sets`, {
    data: {
      sets: [
        { exercise_id: 1, set_index: 1, reps: 8, weight: 60, rpe: 7, completed: true },
        { exercise_id: 1, set_index: 2, reps: 8, weight: 60, rpe: 8, completed: true },
      ],
    },
  });
  await ctx.dispose();
}

test.describe('Calendar page: month view + drag-to-reschedule', () => {
  test.beforeAll(async () => {
    await seedSessions();
  });

  test('Calendar page renders current month with session pills', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Month label visible
    const monthLabel = page.locator('[data-testid="month-label"]');
    await expect(monthLabel).toBeVisible();
    const labelText = await monthLabel.textContent();
    expect(labelText).toMatch(/2026年\d+月/);

    // Calendar grid visible
    const cal = page.locator('[data-testid="month-calendar"]');
    await expect(cal).toBeVisible();

    // 42 day cells (6 weeks × 7 days)
    const cells = await page.locator('[data-testid^="day-cell-"]').count();
    expect(cells).toBe(42);

    // At least 2 session pills
    const pills = await page.locator('[data-testid^="session-pill-"]').count();
    expect(pills).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: join(SHOTS, 'v4-01-calendar-desktop.png'), fullPage: true });
  });

  test('Drag session pill to another day moves the session', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Find a session pill
    const firstPill = page.locator('[data-testid^="session-pill-"]').first();
    await expect(firstPill).toBeVisible();

    const pillTestId = await firstPill.getAttribute('data-testid');
    const sessionId = pillTestId.replace('session-pill-', '');
    console.log('Dragging session', sessionId);

    // Walk up the DOM to find the enclosing day cell — use evaluate to traverse ancestors
    const sourceDate = await firstPill.evaluate((el) => {
      let cur = el;
      while (cur && !(cur.dataset && cur.dataset.date && cur.dataset.date.match(/^\d{4}-\d{2}-\d{2}$/))) {
        cur = cur.parentElement;
      }
      return cur ? cur.dataset.date : null;
    });
    console.log('Source date:', sourceDate);
    expect(sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Pick a target day cell that's empty in this month
    const allCells = await page.locator('[data-testid^="day-cell-"]').all();
    let targetCell = null;
    for (const cell of allCells) {
      const d = await cell.getAttribute('data-date');
      const hasPill = await cell.locator('[data-testid^="session-pill-"]').count();
      if (d && d !== sourceDate && hasPill === 0) {
        targetCell = cell;
        break;
      }
    }
    if (!targetCell) throw new Error('No empty target cell found');
    const targetDate = await targetCell.getAttribute('data-date');
    console.log('Target date:', targetDate);

    // Perform the drag
    const pillBox = await firstPill.boundingBox();
    const targetBox = await targetCell.boundingBox();
    if (!pillBox || !targetBox) throw new Error('Bounding box missing');

    await page.mouse.move(pillBox.x + pillBox.width / 2, pillBox.y + pillBox.height / 2);
    await page.mouse.down();
    // Move in small steps for dnd-kit activation (5px distance threshold)
    await page.mouse.move(
      pillBox.x + pillBox.width / 2 + 20,
      pillBox.y + pillBox.height / 2,
      { steps: 5 },
    );
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 10 },
    );
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Verify via API
    const apiCtx = await request.newContext({ baseURL: process.env.API_URL || 'http://localhost:3001' });
    const r = await apiCtx.get(`/api/sessions/${sessionId}`);
    const body = await r.json();
    const newDate = body.data.session_date;
    console.log('New date on server:', newDate, 'expected:', targetDate);
    expect(newDate).toBe(targetDate);
    await apiCtx.dispose();

    await page.screenshot({ path: join(SHOTS, 'v4-02-calendar-after-drag.png'), fullPage: true });
  });

  test('Mobile: calendar responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const cal = page.locator('[data-testid="month-calendar"]');
    await expect(cal).toBeVisible();
    // On mobile, month navigation controls should be visible
    await expect(page.locator('[data-testid="prev-month"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-month"]')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'v4-03-calendar-mobile.png'), fullPage: true });
  });

  test('Month navigation: prev/next/today buttons work', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(500);

    const initialLabel = await page.locator('[data-testid="month-label"]').textContent();

    // Click next
    await page.click('[data-testid="next-month"]');
    await page.waitForTimeout(200);
    const nextLabel = await page.locator('[data-testid="month-label"]').textContent();
    expect(nextLabel).not.toBe(initialLabel);

    // Click today
    await page.click('[data-testid="today-btn"]');
    await page.waitForTimeout(200);
    const todayLabel = await page.locator('[data-testid="month-label"]').textContent();
    expect(todayLabel).toBe(initialLabel);

    // Click prev
    await page.click('[data-testid="prev-month"]');
    await page.waitForTimeout(200);
    const prevLabel = await page.locator('[data-testid="month-label"]').textContent();
    expect(prevLabel).not.toBe(initialLabel);
  });
});
