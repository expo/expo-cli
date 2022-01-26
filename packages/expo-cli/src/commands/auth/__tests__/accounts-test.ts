import { ApiV2 } from 'xdl';

import { mockExpoXDL } from '../../../__tests__/mock-utils';
import { jester } from '../../../credentials/__tests__/fixtures/mocks-constants';
import Log from '../../../log';
import prompt, { selectAsync } from '../../../utils/prompts';
import { _retryUsernamePasswordAuthWithOTPAsync, UserSecondFactorDeviceMethod } from '../accounts';

jest.mock('../../../utils/prompts');

mockExpoXDL({
  UserManager: {
    initialize: () => {},
    loginAsync: () => jester,
  },
  ApiV2: {
    clientForUser: jest.fn(),
  },
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
    const logSpy = jest.spyOn(Log, 'nested').mockImplementation(() => {});

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

    expect(logSpy.mock.calls[0][0]).toContain(
      'One-time password was sent to the phone number ending'
    );
    expect(result).toBe(jester);

    logSpy.mockRestore();
  });

  it('shows authenticator OTP prompt when authenticator is primary', async () => {
    const logSpy = jest.spyOn(Log, 'nested').mockImplementation(() => {});

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

    expect(logSpy.mock.calls[0][0]).toEqual('One-time password from authenticator required.');
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
    ).rejects.toThrowError(
      'No other second-factor devices set up. Ensure you have set up and certified a backup device.'
    );
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
    ).rejects.toThrowError('Cancelled login');
  });
});
