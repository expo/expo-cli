/**
 * @flow
 */

import chalk from 'chalk';

import { User as UserManager } from 'xdl';
import CommandError from './CommandError';
import prompt from './prompt';

import type { LoginType, User } from 'xdl/build/User';

// const EXP_CLIENT_ID = 'Zso9S1J7xpRYzT4QNlanGYLL5aBrqy1l';
UserManager.initialize();

type CommandOptions = {
  username?: string,
  password?: string,
};

export async function loginOrRegisterIfLoggedOut() {
  if (await UserManager.getCurrentUserAsync()) {
    return;
  }

  console.log(chalk.yellow('\nAn Expo user account is required to proceed.\n'));

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
    await register();
  } else if (action === 'existingUser') {
    await login({});
  } else {
    throw new CommandError('BAD_CHOICE', 'Not logged in.');
  }
}

export async function login(options: CommandOptions) {
  const user = await UserManager.getCurrentUserAsync();
  if (!options.nonInteractive) {
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
    return _usernamePasswordAuth(options.username, options.password);
  } else if (options.username && options.password) {
    return _usernamePasswordAuth(options.username, options.password);
  } else {
    throw new CommandError(
      'NON_INTERACTIVE',
      'Username and password not provided in non-interactive mode.'
    );
  }
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

  let user = await UserManager.loginAsync('user-pass', data);

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
