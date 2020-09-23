import { ApiV2 } from '@expo/xdl';

import { _retryUsernamePasswordAuthWithOTPAsync, UserSecondFactorDeviceMethod } from '../accounts';
import { jester } from '../credentials/test-fixtures/mocks-constants';
import prompt, { selectAsync } from '../prompts';
import { mockExpoXDL } from './mock-utils';

jest.mock('../prompts');

mockExpoXDL({
  UserManager: {
    initialize: () => {},
    loginAsync: () => jester,
  },
  ApiV2: {
    clientForUser: jest.fn(),
  },
});

const originalWarn = console.warn;
const originalLog = console.log;
beforeAll(() => {
  console.warn = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.warn = originalWarn;
  console.log = originalLog;
});

beforeEach(() => {
  (prompt as any).mockReset();
  (prompt as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });

  (selectAsync as any).mockReset();
  (selectAsync as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });

  (ApiV2.clientForUser as any).mockReset();
  (ApiV2.clientForUser as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });
});

describe(_retryUsernamePasswordAuthWithOTPAsync, () => {
  it('shows SMS OTP prompt when SMS is primary and code was automatically sent', async () => {
    const consoleFn = jest.fn();
    console.log = consoleFn;

    (prompt as any)
      .mockImplementationOnce(() => ({ otp: 'hello' }))
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    const result = await _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
      secondFactorDevices: [
        {
          id: 'p0',
          is_primary: true,
          method: UserSecondFactorDeviceMethod.SMS,
          sms_phone_number: 'testphone',
        },
      ],
      smsAutomaticallySent: true,
    });

    expect(consoleFn.mock.calls[0][0]).toContain(
      'One-time password was sent to the phone number ending'
    );
    expect(result).toBe(jester);
  });

  it('shows authenticator OTP prompt when authenticator is primary', async () => {
    const consoleFn = jest.fn();
    console.log = consoleFn;

    (prompt as any)
      .mockImplementationOnce(() => ({ otp: 'hello' }))
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    const result = await _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
      secondFactorDevices: [
        {
          id: 'p0',
          is_primary: true,
          method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
          sms_phone_number: undefined,
        },
      ],
      smsAutomaticallySent: false,
    });

    expect(consoleFn.mock.calls[0][0]).toEqual('One-time password from authenticator required.');
    expect(result).toBe(jester);
  });

  it('shows menu when user bails on primary', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementationOnce(() => ({ otp: 'hello' })) // second time it is prompted after selecting backup code
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as any)
      .mockImplementationOnce(() => -1)
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    const result = await _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
      secondFactorDevices: [
        {
          id: 'p0',
          is_primary: true,
          method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
          sms_phone_number: undefined,
        },
        {
          id: 'p2',
          is_primary: false,
          method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
          sms_phone_number: undefined,
        },
      ],
      smsAutomaticallySent: false,
    });

    expect((selectAsync as any).mock.calls.length).toEqual(1);
    expect(result).toBe(jester);
  });

  it('shows a warning when when user bails on primary and does not have any secondary set up', async () => {
    const consoleFn = jest.fn();
    console.warn = consoleFn;

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process exit called');
    });

    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    await expect(
      _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
        secondFactorDevices: [
          {
            id: 'p0',
            is_primary: true,
            method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
            sms_phone_number: undefined,
          },
        ],
        smsAutomaticallySent: false,
      })
    ).rejects.toThrowError('process exit called');

    expect(consoleFn.mock.calls[0][0]).toContain(
      'No other second-factor devices set up. Ensure you have set up and certified a backup device.'
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('prompts for authenticator OTP when user selects authenticator secondary', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementationOnce(() => ({ otp: 'hello' })) // second time it is prompted after selecting backup code
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as any)
      .mockImplementationOnce(() => -1)
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    await _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
      secondFactorDevices: [
        {
          id: 'p0',
          is_primary: true,
          method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
          sms_phone_number: undefined,
        },
        {
          id: 'p2',
          is_primary: false,
          method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
          sms_phone_number: undefined,
        },
      ],
      smsAutomaticallySent: false,
    });

    expect((prompt as any).mock.calls.length).toBe(2); // first OTP, second OTP
  });

  it('requests SMS OTP and prompts for SMS OTP when user selects SMS secondary', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementationOnce(() => ({ otp: 'hello' })) // second time it is prompted after selecting backup code
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as any)
      .mockImplementationOnce(() => 0)
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    const postAsyncFn = jest.fn();
    (ApiV2.clientForUser as any)
      .mockImplementationOnce(() => ({ postAsync: postAsyncFn }))
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    await _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
      secondFactorDevices: [
        {
          id: 'p0',
          is_primary: true,
          method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
          sms_phone_number: undefined,
        },
        {
          id: 'p2',
          is_primary: false,
          method: UserSecondFactorDeviceMethod.SMS,
          sms_phone_number: 'wat',
        },
      ],
      smsAutomaticallySent: false,
    });

    expect((prompt as any).mock.calls.length).toBe(2); // first OTP, second OTP
    expect(postAsyncFn.mock.calls[0]).toEqual([
      'auth/send-sms-otp',
      {
        username: 'blah',
        password: 'blah',
        secondFactorDeviceID: 'p2',
      },
    ]);
  });

  it('exits when user bails on primary and backup', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as any)
      .mockImplementationOnce(() => -2)
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process exit called');
    });

    await expect(
      _retryUsernamePasswordAuthWithOTPAsync('blah', 'blah', {
        secondFactorDevices: [
          {
            id: 'p0',
            is_primary: true,
            method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
            sms_phone_number: undefined,
          },
          {
            id: 'p2',
            is_primary: false,
            method: UserSecondFactorDeviceMethod.AUTHENTICATOR,
            sms_phone_number: undefined,
          },
        ],
        smsAutomaticallySent: false,
      })
    ).rejects.toThrowError('process exit called');

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
