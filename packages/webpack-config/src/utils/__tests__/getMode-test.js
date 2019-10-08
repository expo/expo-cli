import getMode from '../getMode';

let mode;
beforeAll(() => {
  mode = process.env.NODE_ENV;
});

afterAll(() => {
  process.env.NODE_ENV = mode;
});

it(`accepts boolean`, () => {
  process.env.NODE_ENV = undefined;

  expect(getMode({ production: true })).toBe('production');
  expect(getMode({ development: true })).toBe('development');
});

it(`accepts a "mode" option`, () => {
  process.env.NODE_ENV = undefined;

  expect(getMode({ mode: 'production' })).toBe('production');
  expect(getMode({ development: true, mode: 'production' })).toBe('production');
  expect(getMode({ mode: 'invalid' })).toBe('development');
});

it(`reads from the NODE_ENV environment variable`, () => {
  process.env.NODE_ENV = 'production';
  expect(getMode({})).toBe('production');
});

it(`prioritizes the "mode" option`, () => {
  expect(
    getMode({
      development: true,
      mode: 'production',
    })
  ).toBe('production');
});
