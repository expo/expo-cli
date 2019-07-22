import getMode from '../getMode';

it(`accepts boolean`, () => {
  expect(getMode({ production: true })).toBe('production');
  expect(getMode({ development: true })).toBe('development');
});

it(`accepts a "mode" option`, () => {
  expect(getMode({ mode: 'production' })).toBe('production');
  expect(getMode({ development: true, mode: 'production' })).toBe('production');
  expect(getMode({ mode: 'invalid' })).toBe('development');
});

it(`reads from the NODE_ENV environment variable`, () => {
  const mode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  expect(getMode({})).toBe('production');
  process.env.NODE_ENV = mode;
});
