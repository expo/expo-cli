import { asMock } from '../__tests__/asMock';
import { DoctorCheck } from '../checks/checks.types';
import { runCheckAsync } from '../doctor';
import { Log } from '../utils/log';

jest.mock(`../utils/log`);

jest.mock('../utils/ora', () => ({
  logNewSection: jest.fn(() => ({
    fail: jest.fn(),
    succeed: jest.fn(),
  })),
}));

// required by runAsync
const additionalProjectProps = {
  exp: {
    name: 'name',
    slug: 'slug',
    sdkVersion: '46.0.0',
  },
  pkg: {},
};

class MockSuccessfulCheck implements DoctorCheck {
  description = 'Mock successful check';
  sdkVersionRange = '*';
  runAsync = jest.fn(() => Promise.resolve({ isSuccessful: true, issues: [], advice: [] }));
}

class MockFailedCheckWithSdkFilter implements DoctorCheck {
  description = 'Mock failed check with SDK filter';
  sdkVersionRange = '>=47.0.0';
  runAsync = jest.fn(() =>
    Promise.resolve({ isSuccessful: false, issues: ['issue'], advice: ['advice'] })
  );
}

class MockFailedCheck implements DoctorCheck {
  description = 'Mock failed check';
  sdkVersionRange = '*';
  runAsync = jest.fn(() =>
    Promise.resolve({ isSuccessful: false, issues: ['issue'], advice: ['advice'] })
  );
}

describe(runCheckAsync, () => {
  it(`returns true if check passes`, async () => {
    const result = await runCheckAsync(new MockSuccessfulCheck(), {
      projectRoot: '',
      ...additionalProjectProps,
    });
    expect(result).toBeTruthy();
  });

  it(`returns false if check fails`, async () => {
    const result = await runCheckAsync(new MockFailedCheck(), {
      projectRoot: '',
      ...additionalProjectProps,
    });
    expect(result).toBeFalsy();
  });

  it(`shows issues check fails`, async () => {
    asMock(Log.log).mockReset();
    await runCheckAsync(new MockFailedCheck(), {
      projectRoot: '',
      ...additionalProjectProps,
    });
    expect(asMock(Log.log).mock.calls[0][0]).toContain('Issues:');
  });

  describe('when sdkVersion does not match version range for test', () => {
    it(`returns true, even for failed test`, async () => {
      const result = await runCheckAsync(new MockFailedCheckWithSdkFilter(), {
        projectRoot: '',
        ...additionalProjectProps,
      });
      expect(result).toBeTruthy();
    });

    it(`does not run the test`, async () => {
      const check = new MockFailedCheckWithSdkFilter();
      await runCheckAsync(check, {
        projectRoot: '',
        ...additionalProjectProps,
      });
      expect(check.runAsync).not.toHaveBeenCalled();
    });

    // we should probably acknowledge a test has been skipped, but we can consider this more once
    // we have actual tests that will be skipped
    it(`does not log to the console`, async () => {
      asMock(Log.log).mockReset();
      await runCheckAsync(new MockFailedCheckWithSdkFilter(), {
        projectRoot: '',
        ...additionalProjectProps,
      });
      expect(asMock(Log.log)).not.toHaveBeenCalled();
    });
  });
});
