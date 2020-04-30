import chalk from 'chalk';
import program from 'commander';

import { RegistrationData, User, UserManager } from '@expo/xdl';
import CommandError from './CommandError';
import prompt, { Question } from './prompt';
import log from './log';

UserManager.initialize();

type CommandOptions = {
  username?: string;
  password?: string;
  parent?: {
    nonInteractive: boolean;
  };
};

export async function loginOrRegisterAsync(): Promise<User> {
  log.warn('An Expo user account is required to proceed.');

  if (program.nonInteractive) {
    throw new CommandError(
      'NOT_LOGGED_IN',
      `Not logged in. Use \`${program.name} login -u username -p password\` to log in.`
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
  let user = await UserManager.getCurrentUserAsync();
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
    return _usernamePasswordAuth(options.username, options.password);
  } else if (options.username && options.password) {
    return _usernamePasswordAuth(options.username, options.password);
  } else if (options.username && process.env.EXPO_CLI_PASSWORD) {
    return _usernamePasswordAuth(options.username, process.env.EXPO_CLI_PASSWORD);
  } else {
    throw new CommandError(
      'NON_INTERACTIVE',
      "Username and password not provided in non-interactive mode. Set the EXPO_CLI_PASSWORD environment variable if you don't want to pass in passwords through the command line."
    );
  }
}

async function _usernamePasswordAuth(username?: string, password?: string): Promise<User> {
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
  console.log('\nThanks for signing up!');
  return registeredUser;
}
