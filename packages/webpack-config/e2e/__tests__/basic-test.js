/* global page */
import getenv from 'getenv';

import config from '../../jest-puppeteer.config';

// We know that CI works in this process, but we want to test that it matches the process that our app runs in.
const isInCI = getenv.boolish('CI', false);
const type = getenv.string('EXPO_E2E_COMMAND');

const isProduction = ['build'].includes(type);

function getTestIdQuery(testId) {
  return `div[data-testid="${testId}"]`;
}

// This needs to be evaluated to load the page
beforeEach(async () => {
  jest.setTimeout(60000);
  await page.goto(config.url);
});

describe('Basic', () => {
  it(`should match a text element`, async () => {
    const elementId = getTestIdQuery('basic-text');

    await expect(page).toMatchElement(elementId, {
      text: 'Open up App.js to start working on your app!',
    });
  });

  if (isProduction) {
    xit(`should register expo service worker`, async () => {
      const elementId = getTestIdQuery('has-sw-text-false');

      await expect(page).toMatchElement(elementId, {
        text: 'Has SW installed',
        timeout: 2000,
      });
    });
  }

  describe('Asset loader', () => {
    it(`should load an image as a string like Metro`, async () => {
      const elementId = getTestIdQuery('asset-raw-image');
      await expect(page).toMatchElement(elementId, {
        text: 'data:image/png;base64',
      });
    });

    it(`should load a font as a string like Metro`, async () => {
      const elementId = getTestIdQuery('asset-raw-font');
      await expect(page).toMatchElement(elementId, {
        text: '/static/media/font.b180596bf611ffbf9d1d.ttf',
      });
    });

    it(`should load a random file as a string like Metro`, async () => {
      const elementId = getTestIdQuery('asset-raw-wildcard');
      await expect(page).toMatchElement(elementId, {
        text: 'string',
      });
    });
  });

  it(`should have resize-observer polyfill added`, async () => {
    const elementId = getTestIdQuery('has-resize-observer');
    await expect(page).toMatchElement(elementId, {
      text: 'Has ResizeObserver polyfill',
    });
  });

  describe('DefinePlugin', () => {
    it(`should be aware of process.env.CI`, async () => {
      const elementId = getTestIdQuery('has-ci-text');

      if (isInCI) {
        await expect(page).toMatchElement(elementId, {
          text: 'Has CI env',
        });
      } else {
        await expect(page).not.toMatchElement(elementId);
      }
    });

    it(`should have manifest from expo-constants`, async () => {
      const elementId = getTestIdQuery('expo-constants-manifest');

      await expect(page).toMatchElement(elementId, {
        text: `A Neat Expo App`,
      });
    });
  });
});
