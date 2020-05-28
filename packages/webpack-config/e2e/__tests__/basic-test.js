/* global page */
import getenv from 'getenv';
import config from '../../jest-puppeteer.config';

// We know that CI works in this process, but we want to test that it matches the process that our app runs in.
const isInCI = getenv.boolish('CI', false);
const type = getenv.string('EXPO_E2E_COMMAND');

const isProduction = ['build'].includes(type);

let response;
beforeEach(async () => {
  jest.setTimeout(60000);
  response = await page.goto(config.url);
});

it(`should match a text element`, async () => {
  await expect(page).toMatchElement('div[data-testid="basic-text"]', {
    text: 'Open up App.js to start working on your app!',
  });
});

if (isProduction) {
  it(`should register expo service worker`, async () => {
    const swID = 'div[data-testid="has-sw-text"]';

    await expect(page).toMatchElement(swID, {
      text: 'Has SW installed',
      timeout: 2000,
    });
  });
}

it(`should have resize-observer polyfill added`, async () => {
  const elementId = 'div[data-testid="has-resize-observer"]';
  await expect(page).toMatchElement(elementId, {
    text: 'Has ResizeObserver polyfill',
  });
});

describe('DefinePlugin', () => {
  it(`should be aware of process.env.CI`, async () => {
    const ciID = 'div[data-testid="has-ci-text"]';
    if (isInCI) {
      await expect(page).toMatchElement(ciID, {
        text: 'Has CI env',
      });
    } else {
      await expect(page).not.toMatchElement(ciID);
    }
  });
  it(`should have manifest from expo-constants`, async () => {
    await expect(page).toMatchElement('div[data-testid="expo-constants-manifest"]', {
      text: `A Neat Expo App`,
    });
  });
});
