// Rebuilds assets/downloads/uber-bolt-registration-checklist.pdf from checklist.html.
// Run with Node and Playwright installed:  node tools/checklist/render.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, 'checklist.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = path.join(__dirname, '..', '..', 'assets', 'downloads', 'uber-bolt-registration-checklist.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log(out);
  await browser.close();
})();
