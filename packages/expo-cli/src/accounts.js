/**
 * @flow
 */

import chalk from 'chalk';
import program from 'commander';

import JsonFile from '@expo/json-file';
import { User as UserManager } from '@expo/xdl';
import type { User } from 'xdl/build/User';
import CommandError from './CommandError';
import prompt from './prompt';
import log from './log';

UserManager.initialize();

type CommandOptions = {
  username?: string,
  password?: string,
};

export async function loginOrRegisterIfLoggedOut() {
  let user = await UserManager.getCurrentUserAsync();
  if (user) {
    return user;
  }

  log.warn('An Expo user account is required to proceed.');

  if (program.nonInteractive) {
    throw new CommandError(
      'NOT_LOGGED_IN',
      `Not logged in. Use \`${program.name} login -u username -p password\` to log in.`
    );
  }

  const questions = [
    {
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
    },
  ];

  const { action } = await prompt(questions);

  if (action === 'register') {
    return register();
  } else if (action === 'existingUser') {
    return login({});
  } else {
    throw new CommandError('BAD_CHOICE', 'Not logged in.');
  }
}

async function _sessionAuthAsync(loginSessionPath: string) {
  const { sessionSecret } = await new JsonFile(loginSessionPath).readAsync();
  const user = await UserManager.loginAsync('expo-session', { sessionSecret });
  _printUserLoginStatus(user);
}

export async function login(options: CommandOptions) {
  const user = await UserManager.getCurrentUserAsync();

  // user wants to dump a login session to disk
  if (options.generateSession) {
    if (!user) {
      throw new CommandError('NOT_LOGGED_IN', 'You must be logged in to generate a login session.');
    }
    const sessionDumpPath =
      typeof options.generateSession === 'string'
        ? options.generateSession
        : `${user.username}-login-session.json`;
    const loginSession = await UserManager.newLoginSessionAsync();
    return await new JsonFile(sessionDumpPath).writeAsync(loginSession);
  }

  const nonInteractive = options.parent && options.parent.nonInteractive;
  if (!nonInteractive) {
    if (user) {
      const question = [
        {
          type: 'confirm',
          name: 'action',
          message: `You are already logged in as ${chalk.green(
            user.username
          )}. Log in as new user?`,
        },
      ];

      const { action } = await prompt(question);
      if (!action) {
        // If user chooses to stay logged in, return
        return;
      }
    }
  }

  // user wants to log in with a session file
  if (options.session) {
    return await _sessionAuthAsync(options.session);
  }

  // user wants to log in with username and password
  const username = options.username;
  const password = options.password || process.env.EXPO_CLI_PASSWORD;
  const isMissingCredentials = !username || !password;
  if (nonInteractive && isMissingCredentials) {
    throw new CommandError(
      'NON_INTERACTIVE',
      "Username and password not provided in non-interactive mode. Set the EXPO_CLI_PASSWORD environment variable if you don't want to pass in passwords through the command line."
    );
  }
  return _usernamePasswordAuth(username, password);
}

async function _usernamePasswordAuth(username?: string, password?: string): Promise<User> {
  const questions = [];
  if (!username) {
    questions.push({
      type: 'input',
      name: 'username',
      message: 'Username/Email Address:',
      validate(val) {
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
      validate(val) {
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
  };

  const user = await UserManager.loginAsync('user-pass', data);
  _printUserLoginStatus(user);
}

function _printUserLoginStatus(user: User) {
  if (user) {
    console.log(`\nSuccess. You are now logged in as ${chalk.green(user.username)}.`);
    return user;
  } else {
    throw new Error('Unexpected Error: No user returned from the API');
  }
}

export async function register(): Promise<User> {
  console.log(
    `
Thanks for signing up for Expo!
Just a few questions:
`
  );

  let questions = [
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
        if (val.trim() !== answers.password.trim()) {
          return `Passwords don't match!`;
        }
        return true;
      },
    },
  ];
  let answers = await prompt(questions);
  let registeredUser = await UserManager.registerAsync(answers);
  console.log('\nThanks for signing up!');
  return registeredUser;
}
