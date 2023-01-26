/* eslint-env node */

import withOptimizations, { isDebugMode } from '../withOptimizations';

it(`only uses optimizations in production`, () => {
  expect(
    withOptimizations({
      mode: 'production',
    }).optimization
  ).toBeDefined();

  expect(
    withOptimizations({
      mode: 'development',
    }).optimization
  ).toEqual({
    usedExports: false,
  });
});

it(`doesn't overwrite existing optimizations`, () => {
  expect(
    withOptimizations({
      mode: 'production',
      optimization: {
        randomValue: true,
      },
    }).optimization.randomValue
  ).toBe(true);
});

it(`gets debug mode`, () => {
  process.env.EXPO_WEB_DEBUG = true;
  expect(isDebugMode()).toBe(true);
  process.env.EXPO_WEB_DEBUG = false;
  expect(isDebugMode()).toBe(false);
});
