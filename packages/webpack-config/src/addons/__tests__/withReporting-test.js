/* eslint-env node */
import path from 'path';

import { normalizePaths } from '../../utils';
import withReporting, { throwDeprecatedConfig } from '../withReporting';

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');

it(`throws an error if the deprecated app.json value is used`, () => {
  expect(() =>
    throwDeprecatedConfig({
      web: { build: { report: true } },
    })
  ).toThrow();
});

it(`can report in any mode`, () => {
  for (const mode of ['production', 'development']) {
    expect(
      withReporting(
        {
          mode,
        },
        { projectRoot, report: true }
      ).plugins.length
    ).toBe(2);
  }
});

it(`can prevent plugins from being used`, () => {
  for (const mode of ['production', 'development']) {
    expect(
      withReporting(
        {
          mode,
        },
        { projectRoot, report: false }
      ).plugins
    ).not.toBeDefined();
  }
});

it(`can use a custom output path`, () => {
  const config = withReporting(
    {
      mode: 'development',
    },
    { projectRoot, report: { path: 'random-path', statsFilename: 'my-stats.json' } }
  );

  const [cleanPlugin, reportPlugin] = normalizePaths(config.plugins, value =>
    value.split('packages/webpack-config/e2e/basic/').pop()
  );

  expect(cleanPlugin.cleanOnceBeforeBuildPatterns).toContain('random-path');
  expect(reportPlugin.opts.path).toBe('random-path');
  expect(reportPlugin.opts.statsFilename).toBe('random-path/my-stats.json');
});
