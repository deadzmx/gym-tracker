const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome' });
  const page = await browser.newPage();
  
  // Log all console messages
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const html = await page.content();
  const heatmapCount = (html.match(/calendar-heatmap/g) || []).length;
  console.log('calendar-heatmap occurrences in HTML:', heatmapCount);
  
  const cards = await page.locator('h3').allTextContents();
  console.log('h3 titles:', cards);
  
  await browser.close();
})();
