import mockConsole from 'jest-mock-console';

import { DoctorCheck } from '../checks/checks.types';
import { runCheckAsync } from '../doctor';

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
    const restoreConsole = mockConsole();
    const result = await runCheckAsync(new MockSuccessfulCheck(), {
      projectRoot: '',
      exp: {},
      pkg: {},
    });
    expect(result).toBeTruthy();
    restoreConsole();
  });

  it(`returns false if check fails`, async () => {
    const restoreConsole = mockConsole();
    const result = await runCheckAsync(new MockFailedCheck(), {
      projectRoot: '',
      exp: {},
      pkg: {},
    });
    expect(result).toBeFalsy();
    restoreConsole();
  });

  it(`shows issues check fails`, async () => {
    const restoreConsole = mockConsole();
    await runCheckAsync(new MockFailedCheck(), {
      projectRoot: '',
      exp: {},
      pkg: {},
    });
    expect((console.log as jest.Mock).mock.calls[0][0]).toContain('Issues:');
    restoreConsole();
  });
});
