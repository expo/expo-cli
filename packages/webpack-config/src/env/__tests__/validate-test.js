/* eslint-env node */
import path from 'path';

import { _resetWarnings, validateEnvironment, warnEnvironmentDeprecation } from '../validate';

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');
const mode = 'development';

it(`returns a full environment`, () => {
  const {
    projectRoot: outputProjectRoot,
    locations,
    config,
    ...env
  } = validateEnvironment({
    projectRoot,
    mode,
  });

  expect(outputProjectRoot).toBe(projectRoot);
  expect(locations).toBeDefined();
  expect(config).toBeDefined();
  expect(env).toMatchSnapshot();
  expect(env.report).not.toBeDefined();
});

it(`auto fills a truthy report`, () => {
  const {
    projectRoot: outputProjectRoot,
    locations,
    config,
    ...env
  } = validateEnvironment({
    projectRoot,
    mode,
  });

  expect(outputProjectRoot).toBe(projectRoot);
  expect(locations).toBeDefined();
  expect(config).toBeDefined();
  expect(env).toMatchSnapshot();
});

it(`throws when the projectRoot isn't defined`, () => {
  expect(() => validateEnvironment({})).toThrowError(
    'webpack-config requires a valid projectRoot string value which points to the root of your project'
  );
});

it(`throws when an invalid mode is provided`, () => {
  expect(() => validateEnvironment({ projectRoot: '', mode: '-invalid-' })).toThrowError(
    'requires a valid `mode` string which should be one of'
  );
});

describe('deprecation', () => {
  let oldWarn;
  beforeAll(() => {
    oldWarn = console.warn;
  });
  beforeEach(() => {
    _resetWarnings();
  });
  afterAll(() => {
    console.warn = oldWarn;
  });

  it(`warns when a deprecated property is used`, () => {
    console.warn = jest.fn();
    warnEnvironmentDeprecation({}, false);
    expect(console.warn).not.toBeCalled();

    warnEnvironmentDeprecation({ production: true }, false);
    expect(console.warn).toBeCalledTimes(1);
  });

  it(`can warn for the same property multiple times`, () => {
    console.warn = jest.fn();
    warnEnvironmentDeprecation({ production: true }, false);
    warnEnvironmentDeprecation({ production: true }, false);
    expect(console.warn).toBeCalledTimes(2);
  });

  it(`can prevent duplicate warnings`, () => {
    console.warn = jest.fn();
    warnEnvironmentDeprecation({ production: true }, true);
    warnEnvironmentDeprecation({ production: true }, true);
    expect(console.warn).toBeCalledTimes(1);
  });
});
