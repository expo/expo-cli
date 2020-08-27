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
