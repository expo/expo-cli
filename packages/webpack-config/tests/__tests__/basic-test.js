/* global page */
import config from '../../jest-puppeteer.config';

beforeEach(async () => {
  await page.goto(config.url);
});

it(`should match a text element`, async () => {
  await expect(page).toMatchElement('div[data-testid="basic-text"]', {
    text: 'Open up App.js to start working on your app!',
  });
});
