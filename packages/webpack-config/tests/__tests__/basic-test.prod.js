/* global browser */
import lighthouse from 'lighthouse';
import url from 'url';
import config from '../../jest-puppeteer.config';

describe(`Lighthouse`, () => {
  async function getLighthouseResultsAsync(lhr, property) {
    const result = lhr.categories[property] || lhr.audits[property];

    const score = await result.score;

    // A null value is returned when the test wasn't run
    return score === null ? 1.0 : score;
  }

  const tests = [
    { field: 'performance', name: 'a performance', minValue: 0.97 },
    { field: 'accessibility', name: 'an accessibility', minValue: 0.9 },
    { field: 'best-practices', name: 'best practices', minValue: 0.93 },
    { field: 'speed-index', name: 'a page loading', minValue: 0.99 },
    { field: 'pwa', name: 'a Progressive Web App', minValue: 0.93 },
    { field: 'seo', name: 'SEO' },
    { field: 'color-contrast', name: 'a11y Contrast' },
    { field: 'image-alt', name: 'a11y Alt Text' },
    { field: 'aria-valid-attr', name: 'aria attributes' },
    { field: 'aria-valid-attr-value', name: 'aria values' },
    { field: 'tabindex', name: 'no tabIndex values above 0' },
    { field: 'logical-tab-order', name: 'logical tab order for assitive technology use' },
    { field: 'no-vulnerable-libraries', name: 'library vulnerability' },
  ];

  let lhr;
  beforeAll(async () => {
    // https://github.com/GoogleChrome/lighthouse/issues/8909#issuecomment-501992746
    global.URL = global.URL || require('url').URL;

    jest.setTimeout(60000);

    // await page.close();
    lhr = (await lighthouse(config.url, {
      port: url.parse(browser.wsEndpoint()).port,
      output: 'json',
      logLevel: 'error',
    })).lhr;
  });

  for (const lighthouseTest of tests) {
    const { minValue = 1.0 } = lighthouseTest;
    it(
      minValue >= 1.0
        ? `should have a perfect ${lighthouseTest.name} score`
        : `should have ${lighthouseTest.name} score of ${minValue * 100} or greater`,
      async () => {
        const score = await getLighthouseResultsAsync(lhr, lighthouseTest.field);
        expect(score).toBeGreaterThanOrEqual(minValue);
        expect(score).toMatchSnapshot();
      }
    );
  }
});
