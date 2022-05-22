import shouldUseYarn from '../shouldUseYarn';

beforeAll(() => {
  jest.mock('child_process', () => {
    return {
      execSync: () => {
        if (process.env.CAN_USE_YARN_TEST_VALUE_SHOULD_THROW) {
          throw new Error('failed');
        }
        return 'something';
      },
    };
  });
  jest.mock('../nodeWorkspaces', () => {
    return {
      isUsingNpm: () => {
        return !!process.env.TEST_NPM_LOCKFILE_EXISTS;
      },
    };
  });
});
beforeEach(() => {
  delete process.env.CAN_USE_YARN_TEST_VALUE_SHOULD_THROW;
  delete process.env.npm_config_user_agent;
});

it(`returns true if yarn -v passes`, () => {
  expect(shouldUseYarn()).toBe(true);
});

it(`uses env variable instead of yarn -v`, () => {
  // Ensure yarn -v doesn't work
  process.env.CAN_USE_YARN_TEST_VALUE_SHOULD_THROW = 'true';
  // use env variable
  process.env.npm_config_user_agent = 'yarn';
  expect(shouldUseYarn()).toBe(true);
});

it(`returns false if yarn -v throws an error`, () => {
  // Ensure yarn -v doesn't work
  process.env.CAN_USE_YARN_TEST_VALUE_SHOULD_THROW = 'true';
  expect(shouldUseYarn()).toBe(false);
});

it(`returns false if npm lockfile exists`, () => {
  // Use project with npm lockfile
  process.env.TEST_NPM_LOCKFILE_EXISTS = 'true';
  expect(shouldUseYarn()).toBe(false);
});
