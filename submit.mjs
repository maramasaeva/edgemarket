import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const tasks = JSON.parse(readFileSync('./pw-tasks.json', 'utf8'));
const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

for (const t of tasks) {
  console.log(`\n--- ${t.name} ---`);
  try {
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `pw-${t.name}-1.png` });

    for (const a of t.actions || []) {
      if (a.type === 'fill') {
        const el = page.locator(a.selector).first();
        if (await el.count() > 0) {
          await el.fill(a.value);
          console.log(`  filled: ${a.selector.slice(0, 40)}`);
        }
      } else if (a.type === 'click') {
        const el = page.locator(a.selector).first();
        if (await el.count() > 0) {
          await el.click();
          console.log(`  clicked: ${a.selector.slice(0, 40)}`);
          await page.waitForTimeout(2000);
        }
      } else if (a.type === 'wait') {
        await page.waitForTimeout((a.seconds || 2) * 1000);
      }
    }
    await page.screenshot({ path: `pw-${t.name}-2.png` });
    console.log(`  done: ${page.url()}`);
  } catch (e) {
    console.log(`  error: ${e.message}`);
  }
}
await browser.close();
console.log('\nAll done.');
