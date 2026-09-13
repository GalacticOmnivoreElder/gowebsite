const { test, expect } = require('@playwright/test');

async function start(page, options = {}) {
  await page.emulateMedia({ reducedMotion: options.motion ? 'no-preference' : 'reduce' });
  await page.route('**/animation-manifest.json', route => options.clip
    ? route.fulfill({ json: { chew: '/animations/missing.webm' } }) : route.abort());
  await page.route('**/animations/missing.webm', route => route.fulfill({ status: 404, body: '' }));
  await page.route('**/api/learning-routes?**', route => options.offline ? route.abort() : route.fulfill({ json: { routes: {
    mentor: { title: 'GO Mentorship', verified: true, fallback: false },
    resources: { title: 'Community Resources', verified: true, fallback: false },
    projects: { title: 'GO Projects', verified: true, fallback: false },
    microgame: { title: 'GO Education', verified: true, fallback: true, message: 'This specific page is not currently verified. Explore GO Education instead.' },
  } } }));
  await page.goto('/learn');
  const essential = page.getByRole('button', { name: 'Reject All', exact: true });
  if (await essential.isVisible()) await essential.click();
  await expect(page.getByRole('textbox', { name: 'Ask the Galactic Omnivore' })).toBeVisible();
}
async function ask(page, question) {
  const input = page.getByRole('textbox', { name: 'Ask the Galactic Omnivore' });
  await input.fill(question);
  await input.press('Enter');
  await expect(page.getByRole('article', { name: 'Your learning routes' })).toBeVisible();
}

test('mouth submission, eye focus, Escape, repeat questions and local XP', async ({ page }, testInfo) => {
  const errors = [];
  const progress = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/learning-signal')) progress.push(request); });
  await start(page);
  await expect(page.locator('header')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCount(1);
  await page.screenshot({ path: `tmp/omnivore-${testInfo.project.name}-idle.png` });
  await ask(page, 'I need a mentor');
  const answer = page.getByRole('article', { name: 'Your learning routes' });
  await expect(answer).toBeFocused();
  await expect(answer.getByRole('heading')).toHaveText('GO Mentorship');
  await expect(answer).toContainText('20 XP · Level 1 · this visit');
  await expect(answer.locator('.primary-answer')).toHaveAttribute('href', '/api/go-link?key=mentor');
  await page.screenshot({ path: `tmp/omnivore-${testInfo.project.name}-answer.png` });
  await answer.press('Escape');
  await expect(page.getByRole('textbox')).toBeFocused();
  await ask(page, 'build a microgame');
  await expect(answer.getByRole('heading')).toHaveText('GO Education');
  await expect(answer).toContainText('40 XP');
  await expect(answer.locator('.primary-answer')).toContainText('Explore GO Education');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(progress).toHaveLength(0);
  expect(errors).toEqual([]);
});

test('outages and missing manifest retain accessible navigation', async ({ page }) => {
  await start(page, { offline: true });
  await ask(page, 'How do I make games?');
  await expect(page.getByRole('article')).toContainText('The live directory is unavailable');
  await expect(page.getByRole('link', { name: 'Explore GO Education' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable animation' })).toBeDisabled();
});

test('animated chew, missing video fallback and motion pause', async ({ page }) => {
  await start(page, { motion: true, clip: true });
  const input = page.getByRole('textbox');
  await input.fill('mentor');
  await input.press('Enter');
  await expect(page.locator('[data-phase="chew"]')).toBeVisible();
  await expect(page.locator('.avatar-base')).toBeVisible();
  await expect(page.getByRole('article')).toBeVisible();
  await page.getByRole('button', { name: 'Close answer' }).click();
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await expect(page.locator('.omnivore-interface')).toHaveClass(/motion-quiet/);
  await ask(page, 'mentor');
  await expect(page.locator('video')).toHaveCount(0);
});

test('host navigation remains on other routes and links to the guide', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
});
