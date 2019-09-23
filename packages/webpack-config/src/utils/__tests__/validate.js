import path from 'path';

import {
  validateEnvironment,
  warnEnvironmentDeprecation,
  validateReport,
  _resetWarnings,
} from '../validate';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');
const mode = 'development';

it(`returns a full environment`, () => {
  const { projectRoot: outputProjectRoot, locations, config, ...env } = validateEnvironment({
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
  const { projectRoot: outputProjectRoot, locations, config, ...env } = validateEnvironment({
    projectRoot,
    mode,
    report: true,
  });

  expect(outputProjectRoot).toBe(projectRoot);
  expect(locations).toBeDefined();
  expect(config).toBeDefined();
  expect(env).toMatchSnapshot();
  expect(env.report).toBeDefined();
});

it(`can override a report value`, () => {
  expect(
    validateReport({
      statsFilename: 'custom-stats.json',
    }).statsFilename
  ).toBe('custom-stats.json');
});

it(`throws when the projectRoot isn't defined`, () => {
  expect(() => validateEnvironment({})).toThrowError('projectRoot is a required field');
});

it(`throws when an invalid mode is provided`, () => {
  expect(() => validateEnvironment({ projectRoot: '', mode: '-invalid-' })).toThrowError(
    'mode must be one of the following values:'
  );
});

it(`throws when an invalid platform is provided`, () => {
  expect(() => validateEnvironment({ projectRoot: '', platform: '-invalid-' })).toThrowError(
    'must be one of the following values:'
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
