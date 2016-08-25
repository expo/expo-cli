/**
 * @flow
 */

import * as Analytics from './Analytics';
import Api from './Api';
import * as Intercom from './Intercom';
import * as Password from './Password';
import UserSettings from './UserSettings';

let _currentUser = null;

type User = {
  username: string
};

export async function getCurrentUserAsync(): Promise<?User> {
  let diskUsername = await UserSettings.getAsync('username', null);
  if (_currentUser && _currentUser.username === diskUsername) {
    return _currentUser;
  }

  await whoamiAsync();
  return _currentUser;
}

export async function loginAsync(args: any) {
  // Default to `client` since xde is a client
  args.type = args.type || 'client';

  if (!args.username || !args.password) {
    throw new Error("Both `username` and `password` are required to login or add a new user");
  }

  let hashedPassword = Password.hashPassword(args.password);

  let data = Object.assign({}, args, {hashedPassword});
  delete data.password;

  // console.log("data=", data);

  let result = await Api.callMethodAsync('adduser', data);
  // console.log("result=", result);
  if (result.user) {
    Analytics.logEvent('Login', {
      username: result.user.username,
    });

    Analytics.setUserProperties(result.user.username, {
      username: result.user.username,
    });

    Intercom.update(result.user.username, result.user.intercomUserHash);

    delete result.type;
    _currentUser = result.user;
    // console.log("Login as", result);
    await UserSettings.mergeAsync(result.user);
    return result.user;
  } else {
    return null;
  }
}

export async function logoutAsync() {
  if (_currentUser) {
    Analytics.logEvent('Logout', {
      username: _currentUser.username,
    });
  }

  let result = await Api.callMethodAsync('logout', []);
  await UserSettings.deleteKeyAsync('username');
  _currentUser = null;

  Intercom.update(null, null);

  return result;
}

export async function whoamiAsync() {
  let result = await Api.callMethodAsync('whoami', []);
  if (result.user) {
    _currentUser = result.user;

    Analytics.setUserProperties(result.user.username, {
      username: result.user.username,
    });

    Intercom.update(result.user.username, result.user.intercomUserHash);
  } else {
    Intercom.update(null, null);
  }
  return result.user;
}

export async function getUsernameAsync(): Promise<?string> {
  let user = await getCurrentUserAsync();
  if (user) {
    return user.username;
  } else {
    return null;
  }
}
