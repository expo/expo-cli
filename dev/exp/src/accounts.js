/**
 * @flow
 */

import inquirer from 'inquirer';

import {
  User as UserManager,
} from 'xdl';

import type {
  User,
  UserOrLegacyUser,
} from 'xdl/build/User';

const EXP_CLIENT_ID = 'Zso9S1J7xpRYzT4QNlanGYLL5aBrqy1l';
UserManager.initialize(EXP_CLIENT_ID);

type CommandOptions = {
  facebook?: boolean,
  google?: boolean,
  github?: boolean,
  token?: string,
  username?: string,
  password?: string,
};

export async function login(options: CommandOptions) {
  if (options.facebook) { // handle fb login
    return await _socialAuth('facebook');
  } else if (options.google) { // handle google login
    return await _socialAuth('google');
  } else if (options.github) { // handle github login
    return await _socialAuth('github');
  } else if (options.token) { // handle token login
    return await _tokenAuth(options.token);
  } else { // handle username/password auth
    return await _usernamePasswordAuth(
      options.username,
      options.password,
    );
  }
}

export async function register(options: CommandOptions) {
  if (options.github) { // handle github login
    await _socialAuth('github');
    console.log('\nThanks for signing up!');
  } else {
    await _onboardUser();
    console.log('\nThanks for signing up!');
  }
}

async function _socialAuth(provider: string) {
  let user = await UserManager.loginAsync(provider);
  if (user) {
    if (user.userMetadata.onboarded) {
      console.log('\nSuccess.');
      return user;
    } else {
      user = await _onboardUser(user);
      console.log('\nSuccess.');
      return user;
    }
  } else {
    throw new Error("Unexpected Error: No user returned from the API");
  }
}

async function _tokenAuth(token: string) {
  console.log('\nStay tuned! This feature is not yet implemented.');
  return;
}

async function _usernamePasswordAuth(
  username?: string,
  password?: string,
): Promise<User> {
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

  const answers = await inquirer.prompt(questions);

  const data = {
    username: username || answers.username,
    password: password || answers.password,
  };

  let user = await UserManager.loginAsync('user-pass', data);

  if (user) {
    if (user.userMetadata.onboarded) {
      console.log('\nSuccess.');
      return user;
    } else {
      user = await _onboardUser(user, data);
      console.log('\nSuccess.');
      return user;
    }
  } else {
    throw new Error("Unexpected Error: No user returned from the API");
  }
}

async function _onboardUser(user?: UserOrLegacyUser, usernamePass?: { username: string, password: string }): Promise<User> {
  console.log('');

  const legacyMigration = (user && user.kind === 'legacyUser') ||
    (user && user.kind === 'user' && user.currentConnection === 'Username-Password-Authentication');

  if (user && legacyMigration) {
    console.log(`Signed in as: @${user.username}
Hi there! We don't currently have any way to identify you if you were to lose
your password. Please provide us with your name and e-mail address.`);
  } else {
    console.log(`Thanks for signing up for Exponent!
Just a few questions:`);
  }

  console.log('');

  const questions = [];
  questions.push({
    type: 'input',
    name: 'givenName',
    message: 'First Name:',
    default: ((!legacyMigration && user && user.kind === 'user') && user.givenName) || null,
    validate(val) {
      if (val.trim() === '') {
        return false;
      }
      return true;
    },
  }, {
    type: 'input',
    name: 'familyName',
    message: 'Last Name:',
    default: ((!legacyMigration && user && user.kind === 'user') && user.familyName) || null,
    validate(val) {
      if (val.trim() === '') {
        return false;
      }
      return true;
    },
  });

  if (!legacyMigration) {
    // needs a username
    questions.push({
      type: 'input',
      name: 'username',
      message: 'Username:',
      default: ((user && user.kind === 'user') && (user.username || user.nickname)) || null,
      validate(val, answers) {
        if (val.trim() === '') {
          return false;
        }
        return true;
      },
    });
  }

  questions.push({
    type: 'input',
    name: 'email',
    message: 'Email Address:',
    default: ((!legacyMigration && user && user.kind === 'user') && user.email) || null,
    validate(val) {
      if (val.trim() === '') {
        return false;
      }
      return true;
    },
  });

  if (!legacyMigration || (user && user.userMetadata.needsPasswordMigration)) {
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

  if (!legacyMigration) {
    questions.push({
      type: 'password',
      name: 'passwordRepeat',
      message: 'Password Repeat:',
      validate(val, answers) {
        if (val.trim() === '') {
          return false;
        }
        if (val.trim() !== answers.password.trim()) {
          return `Passwords don't match!`;
        }
        return true;
      },
    });
  }

  const answers = await inquirer.prompt(questions);

  // Don't send user data (username/password) if
  const shouldUpdateUsernamePassword = !(user && user.kind === 'user' && user.userMetadata.legacy);

  const registeredUser = await UserManager.registerAsync({
    ...(shouldUpdateUsernamePassword && usernamePass ? usernamePass : {}),
    ...answers,
  }, user);

  return registeredUser;
}
