import axios from 'axios';

import { mockExpoAPI } from '../../../__tests__/mock-utils';
import { jester } from '../../../credentials/__tests__/fixtures/mocks-constants';
import Log from '../../../log';
import prompt, { selectAsync } from '../../../utils/prompts';
import { _retryUsernamePasswordAuthWithOTPAsync, UserSecondFactorDeviceMethod } from '../accounts';

jest.mock('../../../utils/prompts');
jest.mock('axios');

mockExpoAPI({
  UserManager: {
    sendSmsOtpAsync: jest.requireActual('@expo/dev-api').UserManager.sendSmsOtpAsync,
    initialize: () => {},
    loginAsync: () => jester,
  },
});

beforeEach(() => {
  (prompt as any).mockReset();
  (prompt as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });

  (selectAsync as jest.Mock).mockReset();
  (selectAsync as jest.Mock).mockImplementation(() => {
    throw new Error('Should not be called');
  });

  (axios.request as jest.Mock).mockReset();
  (axios.request as jest.Mock).mockImplementation(() => {
    throw new Error('Should not be called');
  });
});

describe(_retryUsernamePasswordAuthWithOTPAsync, () => {
  it('shows SMS OTP prompt when SMS is primary and code was automatically sent', async () => {
    const logSpy = jest.spyOn(Log, 'nested').mockImplementation(() => {});
    logSpy.mockReset();

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

    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      'One-time password was sent to the phone number ending in testphone.'
    );
    expect(result).toBe(jester);

    logSpy.mockRestore();
  });

  it('shows authenticator OTP prompt when authenticator is primary', async () => {
    const logSpy = jest.spyOn(Log, 'nested').mockImplementation(() => {});
    logSpy.mockReset();
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

    expect(logSpy).toHaveBeenNthCalledWith(1, 'One-time password from authenticator required.');
    expect(result).toBe(jester);
  });

  it('shows menu when user bails on primary', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementationOnce(() => ({ otp: 'hello' })) // second time it is prompted after selecting backup code
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as jest.Mock)
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

    expect(selectAsync).toHaveBeenCalledTimes(1);
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

    (selectAsync as jest.Mock)
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

    // first OTP, second OTP
    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it('requests SMS OTP and prompts for SMS OTP when user selects SMS secondary', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementationOnce(() => ({ otp: 'hello' })) // second time it is prompted after selecting backup code
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as jest.Mock)
      .mockImplementationOnce(() => 0)
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    const postAsyncFn = jest.fn(() => ({ data: {} }));

    (axios.request as jest.Mock).mockImplementationOnce(postAsyncFn).mockImplementation(() => {
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

    expect(prompt).toHaveBeenCalledTimes(2);

    expect(postAsyncFn).toHaveBeenNthCalledWith(1, {
      data: { password: 'blah', secondFactorDeviceID: 'p2', username: 'blah' },
      headers: { 'Exponent-Client': 'xdl' },
      maxBodyLength: 104857600,
      maxContentLength: 104857600,
      method: 'post',
      url: 'https://exp.host/--/api/v2/auth/send-sms-otp',
    });
  });

  it('exits when user bails on primary and backup', async () => {
    (prompt as any)
      .mockImplementationOnce(() => ({ otp: null }))
      .mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

    (selectAsync as jest.Mock)
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
