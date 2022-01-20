import { Auth, UserManager } from '@expo/api';
import assert from 'assert';
import openBrowserAsync from 'better-opn';
import chalk from 'chalk';
import program from 'commander';

import CommandError, { SilentError } from '../../CommandError';
import Log from '../../log';
import { ora } from '../../utils/ora';
import promptNew, { confirmAsync, Question as NewQuestion, selectAsync } from '../../utils/prompts';
import { nonEmptyInput } from '../../utils/validators';

UserManager.initialize();

export type CommandOptions = {
  username?: string;
  password?: string;
  otp?: string;
  parent?: {
    nonInteractive: boolean;
  };
};

export enum UserSecondFactorDeviceMethod {
  AUTHENTICATOR = 'authenticator',
  SMS = 'sms',
}

export type SecondFactorDevice = {
  id: string;
  method: UserSecondFactorDeviceMethod;
  sms_phone_number: string | null;
  is_primary: boolean;
};

export async function loginOrRegisterAsync(): Promise<Auth.User> {
  Log.warn('An Expo user account is required to proceed.');

  // Always try to auto-login when these variables are set, even in non-interactive mode
  if (process.env.EXPO_CLI_USERNAME && process.env.EXPO_CLI_PASSWORD) {
    return login({
      username: process.env.EXPO_CLI_USERNAME,
      password: process.env.EXPO_CLI_PASSWORD,
    });
  }

  if (program.nonInteractive) {
    throw new CommandError(
      'NOT_LOGGED_IN',
      `Not logged in. Use \`${program.name()} login -u username -p password\` to log in.`
    );
  }

  const question: NewQuestion = {
    type: 'select',
    name: 'action',
    message: 'How would you like to authenticate?',
    choices: [
      {
        title: 'Make a new Expo account',
        value: 'register',
      },
      {
        title: 'Log in with an existing Expo account',
        value: 'existingUser',
      },
      {
        title: 'Cancel',
        value: 'cancel',
      },
    ],
  };

  const { action } = await promptNew(question);

  if (action === 'register') {
    openRegistrationInBrowser();
    Log.newLine();
    Log.log(
      `Log in with ${chalk.bold(
        'expo login'
      )} after you have created your account through the website.`
    );
    throw new SilentError();
  } else if (action === 'existingUser') {
    return login({});
  } else {
    throw new CommandError('BAD_CHOICE', 'Not logged in.');
  }
}

export async function loginOrRegisterIfLoggedOutAsync(): Promise<Auth.User> {
  const user = await UserManager.getCurrentUserOnlyAsync();
  if (user) {
    return user;
  }
  return await loginOrRegisterAsync();
}

export async function login(options: CommandOptions): Promise<Auth.User> {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user?.accessToken) {
    throw new CommandError(
      'ACCESS_TOKEN_ERROR',
      'Please remove the EXPO_TOKEN environment var to login with a different user.'
    );
  }

  const nonInteractive = options.parent && options.parent.nonInteractive;
  if (!nonInteractive) {
    if (user) {
      const action = await confirmAsync({
        message: `You are already logged in as ${chalk.green(user.username)}. Log in as new user?`,
      });
      if (!action) {
        // If user chooses to stay logged in, return
        return user as Auth.User;
      }
    }
    return _usernamePasswordAuth(options.username, options.password, options.otp);
  } else if (options.username && options.password) {
    return _usernamePasswordAuth(options.username, options.password, options.otp);
  } else if (options.username && process.env.EXPO_CLI_PASSWORD) {
    return _usernamePasswordAuth(options.username, process.env.EXPO_CLI_PASSWORD, options.otp);
  } else {
    throw new CommandError(
      'NON_INTERACTIVE',
      "Username and password not provided in non-interactive mode. Set the EXPO_CLI_PASSWORD environment variable if you don't want to pass in passwords through the command line."
    );
  }
}

/**
 * Prompt for an OTP with the option to cancel the question by answering empty (pressing return key).
 */
async function _promptForOTPAsync(cancelBehavior: 'cancel' | 'menu'): Promise<string | null> {
  const enterMessage =
    cancelBehavior === 'cancel'
      ? `press ${chalk.bold('Enter')} to cancel`
      : `press ${chalk.bold('Enter')} for more options`;
  const otpQuestion: NewQuestion = {
    type: 'text',
    name: 'otp',
    message: `One-time password or backup code (${enterMessage}):`,
  };

  const { otp } = await promptNew(otpQuestion);
  if (!otp) {
    return null;
  }

  return otp;
}

/**
 * Prompt for user to choose a backup OTP method. If selected method is SMS, a request
 * for a new OTP will be sent to that method. Then, prompt for the OTP, and retry the user login.
 */
async function _promptForBackupOTPAsync(
  username: string,
  password: string,
  secondFactorDevices: SecondFactorDevice[]
): Promise<string | null> {
  const nonPrimarySecondFactorDevices = secondFactorDevices.filter(device => !device.is_primary);

  if (nonPrimarySecondFactorDevices.length === 0) {
    throw new CommandError(
      'LOGIN_CANCELLED',
      'No other second-factor devices set up. Ensure you have set up and certified a backup device.'
    );
  }

  const hasAuthenticatorSecondFactorDevice = nonPrimarySecondFactorDevices.find(
    device => device.method === UserSecondFactorDeviceMethod.AUTHENTICATOR
  );

  const smsNonPrimarySecondFactorDevices = nonPrimarySecondFactorDevices.filter(
    device => device.method === UserSecondFactorDeviceMethod.SMS
  );

  const authenticatorChoiceSentinel = -1;
  const cancelChoiceSentinel = -2;

  const deviceChoices = smsNonPrimarySecondFactorDevices.map((device, idx) => ({
    title: device.sms_phone_number!,
    value: idx,
  }));

  if (hasAuthenticatorSecondFactorDevice) {
    deviceChoices.push({
      title: 'Authenticator',
      value: authenticatorChoiceSentinel,
    });
  }

  deviceChoices.push({
    title: 'Cancel',
    value: cancelChoiceSentinel,
  });

  const question = {
    message: 'Select a second-factor device:',
    choices: deviceChoices,
  };

  const selectedValue = await selectAsync(question);
  if (selectedValue === cancelChoiceSentinel) {
    return null;
  } else if (selectedValue === authenticatorChoiceSentinel) {
    return await _promptForOTPAsync('cancel');
  }

  const device = smsNonPrimarySecondFactorDevices[selectedValue];

  await Auth.sendSmsOtpAsync(null, {
    username,
    password,
    secondFactorDeviceID: device.id,
  });

  return await _promptForOTPAsync('cancel');
}

/**
 * Handle the special case error indicating that a second-factor is required for
 * authentication.
 *
 * There are three cases we need to handle:
 * 1. User's primary second-factor device was SMS, OTP was automatically sent by the server to that
 *    device already. In this case we should just prompt for the SMS OTP (or backup code), which the
 *    user should be receiving shortly. We should give the user a way to cancel and the prompt and move
 *    to case 3 below.
 * 2. User's primary second-factor device is authenticator. In this case we should prompt for authenticator
 *    OTP (or backup code) and also give the user a way to cancel and move to case 3 below.
 * 3. User doesn't have a primary device or doesn't have access to their primary device. In this case
 *    we should show a picker of the SMS devices that they can have an OTP code sent to, and when
 *    the user picks one we show a prompt() for the sent OTP.
 */
export async function _retryUsernamePasswordAuthWithOTPAsync(
  username: string,
  password: string,
  metadata: {
    secondFactorDevices?: SecondFactorDevice[];
    smsAutomaticallySent?: boolean;
  }
): Promise<Auth.User> {
  const { secondFactorDevices, smsAutomaticallySent } = metadata;
  assert(
    secondFactorDevices !== undefined && smsAutomaticallySent !== undefined,
    `Malformed OTP error metadata: ${metadata}`
  );

  const primaryDevice = secondFactorDevices.find(device => device.is_primary);
  let otp: string | null = null;

  if (smsAutomaticallySent) {
    assert(primaryDevice, 'OTP should only automatically be sent when there is a primary device');
    Log.nested(
      `One-time password was sent to the phone number ending in ${primaryDevice.sms_phone_number}.`
    );
    otp = await _promptForOTPAsync('menu');
  }

  if (primaryDevice?.method === UserSecondFactorDeviceMethod.AUTHENTICATOR) {
    Log.nested('One-time password from authenticator required.');
    otp = await _promptForOTPAsync('menu');
  }

  // user bailed on case 1 or 2, wants to move to case 3
  if (!otp) {
    otp = await _promptForBackupOTPAsync(username, password, secondFactorDevices);
  }

  if (!otp) {
    throw new CommandError('LOGIN_CANCELLED', 'Cancelled login');
  }

  return await UserManager.loginAsync('user-pass', {
    username,
    password,
    otp,
  });
}

async function _usernamePasswordAuth(
  username?: string,
  password?: string,
  otp?: string
): Promise<Auth.User> {
  const questions: NewQuestion[] = [];
  if (!username) {
    questions.push({
      type: 'text',
      name: 'username',
      message: 'Username/Email Address:',
      format: val => val.trim(),
      validate: nonEmptyInput,
    });
  }

  if (!password) {
    questions.push({
      type: 'password',
      name: 'password',
      message: 'Password:',
      format: val => val.trim(),
      validate: nonEmptyInput,
    });
  }

  const answers = await promptNew(questions);

  const data = {
    username: username || answers.username,
    password: password || answers.password,
    otp: otp || answers.otp,
  };

  let user: Auth.User;
  try {
    user = await UserManager.loginAsync('user-pass', data);
  } catch (e: any) {
    if (e.code === 'ONE_TIME_PASSWORD_REQUIRED') {
      user = await _retryUsernamePasswordAuthWithOTPAsync(
        data.username,
        data.password,
        e.metadata as any
      );
    } else {
      throw e;
    }
  }

  if (user) {
    Log.log(`\nSuccess. You are now logged in as ${chalk.green(user.username)}.`);
    return user;
  } else {
    throw new Error('Unexpected Error: No user returned from the API');
  }
}

export const REGISTRATION_URL = `https://expo.dev/signup`;

export function openRegistrationInBrowser() {
  const spinner = ora(`Opening ${REGISTRATION_URL}...`).start();
  const opened = openBrowserAsync(REGISTRATION_URL);

  if (opened) {
    spinner.succeed(`Opened ${REGISTRATION_URL} in your web browser.`);
  } else {
    spinner.fail(
      `Unable to open a web browser. Please open your browser and navigate to ${REGISTRATION_URL}.`
    );
  }
}
