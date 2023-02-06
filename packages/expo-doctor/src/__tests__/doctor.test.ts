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

class MockSuccessfulCheck implements DoctorCheck {
  description = 'Mock successful check';
  runAsync = jest.fn(() => Promise.resolve({ isSuccessful: true, issues: [], advice: [] }));
}

class MockFailedCheck implements DoctorCheck {
  description = 'Mock failed check';
  runAsync = jest.fn(() =>
    Promise.resolve({ isSuccessful: false, issues: ['issue'], advice: ['advice'] })
  );
}

describe(runCheckAsync, () => {
  it(`returns true if check passes`, async () => {
    const result = await runCheckAsync(new MockSuccessfulCheck(), {
      projectRoot: '',
      exp: {},
      pkg: {},
    });
    expect(result).toBeTruthy();
  });

  it(`returns false if check fails`, async () => {
    const result = await runCheckAsync(new MockFailedCheck(), {
      projectRoot: '',
      exp: {},
      pkg: {},
    });
    expect(result).toBeFalsy();
  });

  it(`shows issues check fails`, async () => {
    await runCheckAsync(new MockFailedCheck(), {
      projectRoot: '',
      exp: {},
      pkg: {},
    });
    expect(asMock(Log.log).mock.calls[0][0]).toContain('Issues:');
  });
});
