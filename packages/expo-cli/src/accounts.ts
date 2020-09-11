import { ApiV2, RegistrationData, User, UserManager } from '@expo/xdl';
import { ApiV2Error } from '@expo/xdl/build/ApiV2';
import chalk from 'chalk';
import program from 'commander';
import invariant from 'invariant';

import CommandError from './CommandError';
import log from './log';
import prompt, { Question } from './prompt';

UserManager.initialize();

type CommandOptions = {
  username?: string;
  password?: string;
  otp?: string;
  parent?: {
    nonInteractive: boolean;
  };
};

enum UserSecondFactorDeviceMethod {
  AUTHENTICATOR = 'authenticator',
  SMS = 'sms',
}

type SecondFactorDevice = {
  id: string;
  method: UserSecondFactorDeviceMethod;
  sms_phone_number: string | null;
  is_primary: boolean;
};

export async function loginOrRegisterAsync(): Promise<User> {
  log.warn('An Expo user account is required to proceed.');

  if (program.nonInteractive) {
    throw new CommandError(
      'NOT_LOGGED_IN',
      `Not logged in. Use \`${program.name()} login -u username -p password\` to log in.`
    );
  }

  const question: Question = {
    type: 'list',
    name: 'action',
    message: 'How would you like to authenticate?',
    choices: [
      {
        name: 'Make a new Expo account',
        value: 'register',
      },
      {
        name: 'Log in with an existing Expo account',
        value: 'existingUser',
      },
      {
        name: 'Cancel',
        value: 'cancel',
      },
    ],
  };

  const { action } = await prompt(question);

  if (action === 'register') {
    return register();
  } else if (action === 'existingUser') {
    return login({});
  } else {
    throw new CommandError('BAD_CHOICE', 'Not logged in.');
  }
}

export async function loginOrRegisterIfLoggedOutAsync(): Promise<User> {
  const user = await UserManager.getCurrentUserAsync();
  if (user) {
    return user;
  }
  return await loginOrRegisterAsync();
}

export async function login(options: CommandOptions): Promise<User> {
  const user = await UserManager.getCurrentUserAsync();
  const nonInteractive = options.parent && options.parent.nonInteractive;
  if (!nonInteractive) {
    if (user) {
      const question: Question = {
        type: 'confirm',
        name: 'action',
        message: `You are already logged in as ${chalk.green(user.username)}. Log in as new user?`,
      };

      const { action } = await prompt(question);
      if (!action) {
        // If user chooses to stay logged in, return
        return user;
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
    cancelBehavior === 'cancel' ? 'press Enter to cancel' : 'press Enter for other options';
  const otpQuestion: Question = {
    type: 'input',
    name: 'otp',
    message: `One-time Password or Backup Code (${enterMessage}):`,
  };

  const { otp } = await prompt(otpQuestion);
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
    throw new Error('No other second-factor devices set up');
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
    name: device.sms_phone_number!,
    value: idx,
  }));

  if (hasAuthenticatorSecondFactorDevice) {
    deviceChoices.push({
      name: 'Authenticator',
      value: authenticatorChoiceSentinel,
    });
  }

  deviceChoices.push({
    name: 'Cancel',
    value: cancelChoiceSentinel,
  });

  const question: Question = {
    type: 'list',
    name: 'choice',
    message: 'Select a second-factor device:',
    choices: deviceChoices,
    pageSize: Infinity,
  };

  const { choice } = await prompt(question);
  if (choice === cancelChoiceSentinel) {
    throw new Error('Cancelled login');
  } else if (choice === authenticatorChoiceSentinel) {
    return await _promptForOTPAsync('cancel');
  }

  const device = smsNonPrimarySecondFactorDevices[choice];

  const apiAnonymous = ApiV2.clientForUser();
  await apiAnonymous.postAsync('auth/send-sms-otp', {
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
 *    the user picks one we show a prompt for the sent OTP.
 */
async function _retryUsernamePasswordAuthWithOTPAsync(
  username: string,
  password: string,
  metadata: {
    secondFactorDevices?: SecondFactorDevice[];
    smsAutomaticallySent?: boolean;
  }
): Promise<User> {
  const { secondFactorDevices, smsAutomaticallySent } = metadata;
  invariant(
    secondFactorDevices !== undefined && smsAutomaticallySent !== undefined,
    `Malformed OTP error metadata: ${metadata}`
  );

  const primaryDevice = secondFactorDevices.find(device => device.is_primary);
  let otp: string | null = null;

  if (smsAutomaticallySent) {
    invariant(
      primaryDevice,
      'OTP should only automatically be sent when there is a primary device'
    );
    log(
      `One-time password was sent to the phone number ending in ${primaryDevice.sms_phone_number}.`
    );
    otp = await _promptForOTPAsync('menu');
  }

  if (primaryDevice?.method === UserSecondFactorDeviceMethod.AUTHENTICATOR) {
    log(`One-time password from authenticator required.`);
    otp = await _promptForOTPAsync('menu');
  }

  // user bailed on case 1 or 2, wants to move to case 3
  if (!otp) {
    otp = await _promptForBackupOTPAsync(username, password, secondFactorDevices);
  }

  if (!otp) {
    throw new Error('Cancelled login');
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
): Promise<User> {
  const questions: Question[] = [];
  if (!username) {
    questions.push({
      type: 'input',
      name: 'username',
      message: 'Username/Email Address:',
      validate(val: string) {
        if (val.trim() === '') {
          return false;
        }
        return true;
      },
    });
  }

  if (!password) {
    questions.push({
      type: 'password',
      name: 'password',
      message: 'Password:',
      validate(val: string) {
        if (val.trim() === '') {
          return false;
        }
        return true;
      },
    });
  }

  const answers = await prompt(questions);

  const data = {
    username: username || answers.username,
    password: password || answers.password,
    otp: otp || answers.otp,
  };

  let user: User;
  try {
    user = await UserManager.loginAsync('user-pass', data);
  } catch (e) {
    if (e instanceof ApiV2Error && e.code === 'ONE_TIME_PASSWORD_REQUIRED') {
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
    log(`\nSuccess. You are now logged in as ${chalk.green(user.username)}.`);
    return user;
  } else {
    throw new Error('Unexpected Error: No user returned from the API');
  }
}

export async function register(): Promise<User> {
  log(
    `
Thanks for signing up for Expo!
Just a few questions:
`
  );

  const questions: Question[] = [
    {
      type: 'input',
      name: 'email',
      message: 'E-mail:',
      filter: val => val.trim(),
      validate(val) {
        if (val.trim() === '') {
          return false;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'username',
      message: 'Username:',
      filter: val => val.trim(),
      validate(val) {
        if (val.trim() === '') {
          return false;
        }
        return true;
      },
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      filter: val => val.trim(),
      validate(val) {
        if (val.trim() === '') {
          return 'Please create a password';
        }
        return true;
      },
    },
    {
      type: 'password',
      name: 'passwordRepeat',
      message: 'Confirm Password:',
      validate(val, answers) {
        if (val.trim() === '') {
          return false;
        }
        if (!answers || !answers.password || val.trim() !== answers.password.trim()) {
          return `Passwords don't match!`;
        }
        return true;
      },
    },
  ];
  const answers = await prompt(questions);
  const registeredUser = await UserManager.registerAsync(answers as RegistrationData);
  log('\nThanks for signing up!');
  return registeredUser;
}
