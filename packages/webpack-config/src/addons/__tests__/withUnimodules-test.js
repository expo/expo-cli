import path from 'path';

import { ignoreExternalModules } from '../withUnimodules';

describe('ignoreExternalModules', () => {
  // Transformations
  it(`skips when no externals are defined`, () => {
    const config = ignoreExternalModules({}, () => true);
    expect(config.externals).not.toBeDefined();
  });
  it(`converts a single external into an array`, () => {
    const config = ignoreExternalModules(
      {
        externals: 'value',
      },
      () => true
    );
    expect(config.externals).toStrictEqual(['value']);
  });
  it(`does not modify externals that are not functions`, () => {
    const externals = ['value', true, 1, {}];
    const config = ignoreExternalModules(
      {
        externals,
      },
      () => true
    );
    expect(config.externals).toStrictEqual(externals);
  });

  // Test that the Next.js externals are used when we do not need the incoming module to be ignored.
  it(`will invoke the default external when the input external returns false`, () => {
    const incomingExternal = jest.fn();
    const inputExternal = jest.fn(module => module.includes('expo'));
    const externals = [incomingExternal];
    const config = ignoreExternalModules(
      {
        externals,
      },
      inputExternal
    );

    // mock execute externals for expo module
    let executionCallback = jest.fn();
    config.externals[0]({}, 'expo-auth-session', executionCallback);
    expect(inputExternal).toBeCalled();
    expect(executionCallback).toBeCalled();
    expect(incomingExternal).not.toBeCalled();

    // mock execute externals for non-expo modules
    executionCallback = jest.fn();
    config.externals[0]({}, 'other-package', executionCallback);
    expect(inputExternal).toBeCalledWith(`node_modules${path.sep}other-package`);
    expect(executionCallback).not.toBeCalled();
    expect(incomingExternal).toBeCalled();
  });
});
