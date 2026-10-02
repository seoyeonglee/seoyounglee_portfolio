const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const html = await fs.readFile(path.join(__dirname, '../index.html'));
  const out = path.join(__dirname, '../artifacts');
  await fs.mkdir(out, { recursive: true });
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') return res.writeHead(204).end();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const [name, viewport] of [['desktop', { width: 1440, height: 1080 }], ['mobile', { width: 390, height: 844 }]]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      const inViewport = selector => page.waitForFunction(selector => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return box.bottom > 130 && box.top < innerHeight;
      }, selector);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.locator('.hero-tagline').waitFor({ state: 'visible' });
      await page.waitForFunction(() => ['.hero-tagline', '.hero-cta', '.hero-status', '#panel-overview'].every(selector => getComputedStyle(document.querySelector(selector)).opacity === '1'));
      await page.screenshot({ path: path.join(out, `${name}-overview.png`) });

      await page.getByRole('link', { name: 'Get in Touch' }).click();
      await page.waitForURL('**/#contact');
      await page.locator('[data-tab="projects"]').click();
      await page.waitForURL('**/#projects');
      assert.ok(await page.locator('#panel-projects').isVisible());
      const count = await page.evaluate(() => history.length);
      await page.locator('[data-tab="projects"]').click();
      assert.equal(await page.evaluate(() => history.length), count);
      await page.locator('[data-tab="studies"]').click();
      await page.goBack();
      await page.waitForURL('**/#projects');
      assert.ok(await page.locator('#panel-projects').isVisible());
      await page.goBack();
      await page.waitForURL('**/#contact');
      assert.ok(await page.locator('#panel-overview').isVisible());
      assert.ok(await page.locator('#contact').isVisible());
      await inViewport('#contact');
      await page.goForward();
      await page.waitForURL('**/#projects');
      assert.ok(await page.locator('#panel-projects').isVisible());
      results.push(`${name}: contact/tab hash, repeated clicks, Back/Forward`);

      await page.reload();
      assert.ok(await page.locator('#panel-projects').isVisible());
      for (const route of ['overview', 'studies', 'projects']) {
        await page.goto(base + '#' + route);
        assert.ok(await page.locator('#panel-' + route).isVisible());
        assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
      }
      await page.locator('[data-tab="overview"]').click();
      await page.waitForURL('**/#overview');
      await page.locator('[data-tab="overview"]').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.waitForURL('**/#projects');
      assert.equal(await page.locator('[data-tab="projects"]').getAttribute('aria-selected'), 'true');
      assert.ok(await page.locator('#panel-projects').isVisible());
      results.push(`${name}: direct routes, reload, keyboard tab selection`);

      const cards = page.locator('#panel-projects .side-list').first().locator('.side-row');
      const titles = await cards.locator('.side-row-title').allTextContents();
      assert.match(titles[0], /Audit Evidence \/ Operations/);
      assert.match(titles[1], /FinScope/);
      await cards.nth(0).scrollIntoViewIfNeeded();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#panel-projects .side-row')).opacity === '1');
      await page.evaluate(() => window.scrollTo(0, document.querySelector('#panel-projects .side-list').getBoundingClientRect().top + window.scrollY - 130));
      await page.screenshot({ path: path.join(out, `${name}-projects.png`) });
      await cards.nth(1).scrollIntoViewIfNeeded();
      await cards.nth(1).screenshot({ path: path.join(out, `${name}-finscope.png`) });
      for (const card of [cards.nth(0), cards.nth(1)]) {
        const box = await card.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, 'featured card fits viewport');
        for (const link of await card.locator('a').all()) {
          const b = await link.boundingBox();
          assert.ok(b.x >= 0 && b.x + b.width <= viewport.width + 1, 'project link fits viewport');
          assert.equal(await link.getAttribute('target'), '_blank');
          assert.match(await link.getAttribute('rel'), /noopener/);
        }
      }
      const layout = await page.evaluate(() => ({
        width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        overflowing: [...document.querySelectorAll('body *')].map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 100), right: el.getBoundingClientRect().right })).filter(el => el.right > innerWidth + 1),
      }));
      await fs.writeFile(path.join(out, `${name}-layout.json`), JSON.stringify(layout, null, 2));
      assert.ok(layout.documentWidth <= layout.width, JSON.stringify(layout));
      results.push(`${name}: current featured content, links, screenshots, no horizontal overflow`);

      await page.getByRole('button', { name: 'Open command palette' }).click();
      await page.locator('#cmdkInput').fill('Open FinScope');
      assert.equal(await page.locator('.cmdk-item').count(), 1);
      await page.screenshot({ path: path.join(out, `${name}-palette.png`) });
      // Stub only the destination document: this verifies the actual popup target without
      // depending on an external host's cold start. Reachability is checked separately.
      await context.route('https://seoyoung-finscope.onrender.com/**', route => route.fulfill({ body: '<title>Destination check</title>' }));
      const popupPromise = context.waitForEvent('page');
      await page.locator('#cmdkInput').press('Enter');
      const popup = await popupPromise;
      await popup.waitForURL('https://seoyoung-finscope.onrender.com/');
      await popup.close();
      assert.ok(await page.locator('#cmdkModal').isHidden());
      await page.getByRole('button', { name: 'Open command palette' }).click();
      await page.locator('#cmdkInput').fill('no-such-project');
      assert.match(await page.locator('#cmdkList').textContent(), /No matches/);
      await page.locator('#cmdkInput').press('Escape');
      assert.ok(await page.locator('#cmdkModal').isHidden());
      await page.getByRole('button', { name: 'Open command palette' }).click();
      await page.locator('#cmdkInput').fill('Jump to Contact');
      await page.locator('#cmdkInput').press('Enter');
      await page.waitForURL('**/#contact');
      assert.ok(await page.locator('#panel-overview').isVisible());
      await inViewport('#contact');
      await page.goto(base + '#stack');
      assert.ok(await page.locator('#panel-overview').isVisible());
      await inViewport('#stack');
      results.push(`${name}: palette search, FinScope popup URL, empty state, Escape, contact and skills anchors`);

      await page.locator('[data-tab="overview"]').click();
      await page.locator('#langToggle').click();
      assert.match(await page.locator('.hero-tagline').textContent(), /풀스택/);
      await page.locator('#themeToggle').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.waitForFunction(() => scrollY === 0 && getComputedStyle(document.querySelector('#panel-overview')).opacity === '1');
      await page.screenshot({ path: path.join(out, `${name}-overview-ko-light.png`) });
      assert.deepEqual(errors, []);
      results.push(`${name}: Korean copy, light theme, no uncaught JavaScript errors`);
      await context.close();
    }
    await fs.writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, results }, null, 2) + '\n');
    console.log(results.map(result => 'PASS ' + result).join('\n'));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
