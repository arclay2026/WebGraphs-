// Remakes the share-preview cards in assets/og/ from card.html.
// Run from anywhere with Node and Playwright installed:  node tools/share-cards/render.js
// Edit the wording per page in card.html (the C object), then re-run.
const path = require('path');
const { chromium } = require('playwright');
const pages = ['index', 'driver-checker', 'courses', 'services', 'about', 'pricing', 'contact', 'faq', 'qr-code', 'signature-maker', 'photos-to-pdf'];
const out = path.join(__dirname, '..', '..', 'assets', 'og');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const name of pages) {
    await page.goto('file://' + path.join(__dirname, 'card.html') + '?c=' + name);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 86 });
    console.log('assets/og/' + name + '.jpg');
  }
  await browser.close();
})();
