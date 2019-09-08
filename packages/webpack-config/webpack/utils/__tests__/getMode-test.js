'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const getMode_1 = __importDefault(require('../getMode'));
it(`accepts boolean`, () => {
  expect(getMode_1.default({ production: true })).toBe('production');
  expect(getMode_1.default({ development: true })).toBe('development');
});
it(`accepts a "mode" option`, () => {
  expect(getMode_1.default({ mode: 'production' })).toBe('production');
  expect(getMode_1.default({ development: true, mode: 'production' })).toBe('production');
  expect(getMode_1.default({ mode: 'invalid' })).toBe('development');
});
it(`reads from the NODE_ENV environment variable`, () => {
  const mode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    expect(getMode_1.default({})).toBe('production');
  } finally {
    process.env.NODE_ENV = mode;
  }
});
it(`prioritizes the "mode" option`, () => {
  expect(
    getMode_1.default({
      development: true,
      mode: 'production',
    })
  ).toBe('production');
});
//# sourceMappingURL=getMode-test.js.map
