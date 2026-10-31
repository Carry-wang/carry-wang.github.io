const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test, before, after } = require('node:test');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
let server;
let browser;
let origin;

before(async () => {
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/html' });
      response.end('<h1>File not found</h1>');
      return;
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' });
    fs.createReadStream(filename).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROME_EXECUTABLE;
  // Loopback tests must not depend on the machine's proxy/PAC configuration.
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-proxy-server'] });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openPage(t, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  t.after(() => page.close());
  await page.goto(origin, { waitUntil: 'networkidle' });
  return page;
}

test('contains the approved identity, factual content and named sections', async t => {
  const page = await openPage(t);
  assert.equal(await page.locator('h1').textContent(), 'Baojie Wang');
  const text = await page.locator('body').innerText();
  for (const content of ['王宝杰', 'Zhejiang University', 'RoleMotion:', 'Junran Peng', '27,831', 'EvoPatient', '12.7%', 'AIData Team', 'Jun 2028', 'Local preview']) {
    assert.ok(text.includes(content), `Missing approved content: ${content}`);
  }
  for (const id of ['about', 'research', 'news', 'publications', 'experience', 'education', 'projects']) {
    assert.equal(await page.locator(`main section#${id}`).count(), 1, `Missing section ${id}`);
  }
  assert.equal(await page.locator('main h2').count(), 7);
  assert.equal(await page.locator('a[href="mailto:22560450@zju.edu.cn"]').count() >= 1, true);
  assert.equal(await page.locator('a[href="https://github.com/Carry-wang"]').count() >= 1, true);
  assert.ok(!/Zhuoyun Du|THUNLP|Incoming Ph\.D\.|CoEvoBench|CoSWE/.test(text), 'Do not import reference identity or unpublished projects');
});

test('all anchors and local assets resolve, and rendering makes no external requests', async t => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  t.after(() => page.close());
  const requests = [];
  const errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  const result = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    return {
      duplicates: ids.filter((id, index) => ids.indexOf(id) !== index),
      brokenAnchors: [...document.querySelectorAll('a[href^="#"]')].map(link => link.getAttribute('href')).filter(href => href.length < 2 || !document.getElementById(href.slice(1))),
      assets: [...document.querySelectorAll('img[src], script[src], link[rel="stylesheet"], link[rel="icon"]')].map(element => element.src || element.href),
      images: [...document.images].map(image => ({ src: image.getAttribute('src'), alt: image.hasAttribute('alt'), loaded: image.complete && image.naturalWidth > 0 })),
      externalTargets: [...document.querySelectorAll('a[target="_blank"]')].map(link => ({ href: link.href, secure: link.relList.contains('noopener') && link.relList.contains('noreferrer') }))
    };
  });
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.brokenAnchors, []);
  assert.ok(result.images.length >= 5);
  assert.ok(result.images.every(image => image.alt && image.loaded), JSON.stringify(result.images));
  for (const asset of result.assets) assert.equal((await page.request.get(asset)).status(), 200, asset);
  assert.ok(result.externalTargets.every(link => link.secure));
  assert.deepEqual(errors, []);
  assert.deepEqual(requests.filter(url => !url.startsWith(origin)), [], 'No trackers, remote fonts, or remote embeds');
});

test('desktop uses a sticky left profile and a white reading column', async t => {
  const page = await openPage(t);
  assert.equal(await page.locator('.profile').count(), 1);
  const initial = await page.evaluate(() => {
    const profile = document.querySelector('.profile');
    const main = document.querySelector('main');
    return {
      left: profile.getBoundingClientRect().left,
      right: profile.getBoundingClientRect().right,
      top: profile.getBoundingClientRect().top,
      mainLeft: main.getBoundingClientRect().left,
      position: getComputedStyle(profile).position,
      background: getComputedStyle(document.body).backgroundColor,
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  });
  assert.equal(initial.position, 'sticky');
  assert.equal(initial.background, 'rgb(255, 255, 255)');
  assert.ok(initial.mainLeft - initial.right >= 40);
  assert.equal(initial.overflow, false);
  await page.locator('#experience').scrollIntoViewIfNeeded();
  const topAfter = await page.locator('.profile').evaluate(element => element.getBoundingClientRect().top);
  assert.ok(topAfter >= 20 && topAfter <= 90, `Profile left the viewport: ${topAfter}`);
});

test('375px, 390px, 768px and 1024px layouts do not overflow', async t => {
  const page = await openPage(t);
  for (const width of [375, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      profileBottom: document.querySelector('.profile').getBoundingClientRect().bottom,
      mainTop: document.querySelector('main').getBoundingClientRect().top
    }));
    assert.ok(layout.scrollWidth <= width, `Horizontal overflow at ${width}px: ${layout.scrollWidth}`);
    if (width <= 768) assert.ok(layout.mainTop > layout.profileBottom, `Mobile profile overlaps content at ${width}px`);
  }
});

test('navigation moves to a real section and updates its current state', async t => {
  const page = await openPage(t);
  assert.equal(await page.locator('.page-nav a[href="#publications"]').count(), 1);
  await page.locator('.page-nav a[href="#publications"]').click();
  await page.waitForTimeout(150);
  assert.equal(new URL(page.url()).hash, '#publications');
  assert.equal(await page.locator('.page-nav a[href="#publications"]').getAttribute('aria-current'), 'location');
  const top = await page.locator('#publications').evaluate(element => element.getBoundingClientRect().top);
  assert.ok(top >= 0 && top < 100, `Publication heading is not visible: ${top}`);
});

test('paper dialog supports Escape, focus return, close button and backdrop', async t => {
  const page = await openPage(t);
  const trigger = page.locator('[data-paper-preview]');
  assert.equal(await trigger.count(), 1);
  await trigger.click();
  const dialog = page.locator('#paper-preview');
  assert.equal(await dialog.evaluate(element => element.open), true);
  assert.ok(await dialog.locator('img').evaluate(image => image.complete && image.naturalWidth > 0));
  await page.keyboard.press('Escape');
  assert.equal(await dialog.evaluate(element => element.open), false);
  assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
  assert.equal(await page.locator('body').evaluate(element => element.classList.contains('has-dialog')), false);
  await trigger.click();
  await page.locator('[data-close-preview]').click();
  assert.equal(await dialog.evaluate(element => element.open), false);
  await trigger.click();
  await page.mouse.click(5, 5);
  assert.equal(await dialog.evaluate(element => element.open), false);
});

test('keyboard users can skip the sidebar and reach content', async t => {
  const page = await openPage(t);
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  assert.equal(await skip.count(), 1);
  assert.equal(await skip.evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('main').evaluate(element => element === document.activeElement), true);
});

test('core content, navigation and paper fallback work with JavaScript disabled', async t => {
  const page = await openPage(t, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  assert.equal(await page.locator('h1').textContent(), 'Baojie Wang');
  assert.equal(await page.locator('main section').count(), 7);
  assert.equal(await page.locator('[data-paper-preview]').getAttribute('href'), 'assets/images/rolemotion-preview.png');
  assert.ok(await page.locator('a[href="https://arxiv.org/abs/2512.01582"]').count() >= 1);
  await page.locator('.page-nav a[href="#education"]').click();
  assert.equal(new URL(page.url()).hash, '#education');
});
