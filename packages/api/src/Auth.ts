import assert from 'assert';

import ApiV2, { ApiV2ClientOptions } from './ApiV2';
import { ApiError } from './utils/errors';

export type User = {
  kind: 'user';
  // required
  username: string;
  nickname: string;
  userId: string;
  picture: string;
  // optional
  email?: string;
  emailVerified?: boolean;
  givenName?: string;
  familyName?: string;
  userMetadata: {
    onboarded: boolean;
    legacy?: boolean;
  };
  // auth methods
  currentConnection: ConnectionType;
  sessionSecret?: string;
  accessToken?: string;
};
// note: user-token isn't listed here because it's a non-persistent pre-authenticated method
export type LoginType = 'user-pass' | 'facebook' | 'google' | 'github';

export type RobotUser = {
  kind: 'robot';
  // required
  userId: string;
  username: string; // backwards compatible to show in current UI -- based on given name or placeholder
  // optional
  givenName?: string;
  // auth methods
  currentConnection: ConnectionType;
  sessionSecret?: never; // robot users only use accessToken -- this prevents some extraneous typecasting
  accessToken?: string;
};

export type ConnectionType =
  | 'Access-Token-Authentication'
  | 'Username-Password-Authentication'
  | 'facebook'
  | 'google-oauth2'
  | 'github';

export type UserData = {
  developmentCodeSigningId?: string;
  appleId?: string;
  userId?: string;
  username?: string;
  currentConnection?: ConnectionType;
  sessionSecret?: string;
};

export type LegacyUser = {
  kind: 'legacyUser';
  username: string;
  userMetadata: {
    legacy: boolean;
    needsPasswordMigration: boolean;
  };
};

export type UserOrLegacyUser = User | LegacyUser;

export type RegistrationData = {
  username: string;
  password: string;
  email?: string;
  givenName?: string;
  familyName?: string;
};

export async function getUserInfoAsync(
  user?: ApiV2ClientOptions
): Promise<{ user_type: string } & any> {
  const results = await ApiV2.clientForUser(user).getAsync('auth/userInfo');

  if (!results) {
    throw new Error('Unable to fetch user.');
  }
  return results;
}

/**
 * @param user
 * @param props.secondFactorDeviceID UUID of the second factor device
 */
export async function sendSmsOtpAsync(
  user: ApiV2ClientOptions | null,
  {
    username,
    password,
    secondFactorDeviceID,
  }: {
    username: string;
    password: string;
    secondFactorDeviceID: string;
  }
): Promise<unknown> {
  return await ApiV2.clientForUser(user).postAsync('auth/send-sms-otp', {
    username,
    password,
    secondFactorDeviceID,
  });
}

/**
 * Logs in a user for a given login type.
 *
 * Valid login types are:
 *  - "user-pass": Username and password authentication
 *
 * If the login type is "user-pass", we directly make the request to www
 * to login a user.
 */
export async function loginAsync(
  loginType: LoginType,
  loginArgs?: { username: string; password: string; otp?: string }
): Promise<string> {
  assert(loginType === 'user-pass', `Invalid login type provided. Must be 'user-pass'.`);
  assert(loginArgs, `The 'user-pass' login type requires a username and password.`);
  const { error, sessionSecret, error_description } = await ApiV2.clientForUser().postAsync(
    'auth/loginAsync',
    {
      username: loginArgs.username,
      password: loginArgs.password,
      otp: loginArgs.otp,
    }
  );
  if (error) {
    throw new ApiError('INVALID_USERNAME_PASSWORD', error_description);
  }
  return sessionSecret;
}

/** Create or update a user. */
export async function createOrUpdateUserAsync(
  user: User | RobotUser | null,
  userData: any
): Promise<User | null> {
  if (user?.kind === 'robot') {
    throw new ApiError('ROBOT_ACCOUNT_ERROR', 'This action is not available for robot users');
  }

  const { user: updatedUser } = await ApiV2.clientForUser(user).postAsync(
    'auth/createOrUpdateUser',
    {
      userData,
    }
  );

  return updatedUser;
}
