import { createClientEnvironment } from '../ExpoDefinePlugin';

beforeEach(() => {
  delete process.env.EXPO_WEBPACK_DEFINE_ENVIRONMENT_AS_KEYS;
});

it(`defines process.env as an object by default`, () => {
  const env = createClientEnvironment('development', '/', { foo: 'bar' });

  expect(env.__DEV__).toBe(true);
  // @ts-ignore
  expect(env['process.env'].NODE_ENV).toBe('"development"');
  expect(env['process.env.NODE_ENV']).not.toBeDefined();
});

it(`defines process.env explicitly as keys`, () => {
  process.env.EXPO_WEBPACK_DEFINE_ENVIRONMENT_AS_KEYS = 'true';

  const env = createClientEnvironment('development', '/', { foo: 'bar' });

  expect(env.__DEV__).toBe(true);
  expect(env['process.env']).not.toBeDefined();
  expect(env['process.env.NODE_ENV']).toBe('"development"');
});
