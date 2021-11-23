import {
  Auth,
  InvalidUserCredentialsError,
  RequestContext,
  Session,
  Teams,
} from '@expo/apple-utils';
import assert from 'assert';
import chalk from 'chalk';

import { AbortCommandError } from '../CommandError';
import Log from '../log';
import { toggleConfirmAsync } from '../utils/prompts';
import {
  deletePasswordAsync,
  promptPasswordAsync,
  resolveCredentialsAsync,
} from './resolveCredentials';

const APPLE_IN_HOUSE_TEAM_TYPE = 'in-house';

export type Options = {
  appleId?: string;
  teamId?: string;
  /**
   * Can be used to restore the Apple auth state via apple-utils.
   */
  cookies?: Session.AuthState['cookies'];
};

export type Team = {
  id: string;
  name?: string;
  inHouse?: boolean;
};

export type AppleCtx = {
  appleId: string;
  appleIdPassword?: string;
  team: Team;
  /**
   * Defined when using Fastlane
   */
  fastlaneSession?: string;
  /**
   * Can be used to restore the Apple auth state via apple-utils.
   */
  authState?: Session.AuthState;
};

export function getRequestContext(authCtx: AppleCtx): RequestContext {
  assert(authCtx.authState?.context, 'Apple request context must be defined');
  return authCtx.authState.context;
}

async function loginAsync(
  userCredentials: Partial<Auth.UserCredentials> = {},
  options: Auth.LoginOptions
): Promise<Session.AuthState> {
  // First try login with cookies JSON
  if (userCredentials.cookies) {
    const session = await Auth.loginWithCookiesAsync(userCredentials);
    // If the session isn't valid, continue to the other authentication methods.
    // Use `loginWithCookiesAsync` for a less resilient flow.
    if (session) {
      return session;
    }
  }

  // Resolve the user credentials, optimizing for password-less login.
  const { username, password } = await resolveCredentialsAsync(userCredentials);
  assert(username);

  // Clear data
  Auth.resetInMemoryData();

  try {
    // Attempt to rehydrate the session.
    const restoredSession = await Auth.tryRestoringAuthStateFromUserCredentialsAsync(
      {
        username,
        providerId: userCredentials.providerId,
        teamId: userCredentials.teamId,
      },
      options
    );
    if (restoredSession) {
      // Completed authentication!
      return { password, ...restoredSession };
    }

    return await loginWithUserCredentialsAsync({
      username,
      password,
      providerId: userCredentials.providerId,
      teamId: userCredentials.teamId,
    });
  } catch (error) {
    if (error instanceof InvalidUserCredentialsError) {
      Log.error(error.message);
      // Remove the invalid password so it isn't automatically used...
      await deletePasswordAsync({ username });

      if (await toggleConfirmAsync({ message: 'Would you like to try again?' })) {
        // Don't pass credentials back or the method will throw
        return loginAsync(
          {
            teamId: userCredentials.teamId,
            providerId: userCredentials.providerId,
          },
          options
        );
      } else {
        throw new AbortCommandError();
      }
    }
    throw error;
  }
}

async function loginWithUserCredentialsAsync({
  username,
  password,
  teamId,
  providerId,
}: {
  username: string;
  password?: string;
  teamId?: string;
  providerId?: number;
}) {
  // Start a new login flow
  const newSession = await Auth.loginWithUserCredentialsAsync({
    username,
    // If the session couldn't be restored, then prompt for the password (also check if it's stored in the keychain).
    password: password || (await promptPasswordAsync({ username })),
    providerId,
    teamId,
  });
  // User cancelled or something.
  assert(newSession, 'An unexpected error occurred while completing authentication');

  // Success!
  return newSession;
}

export async function authenticateAsync(options: Options = {}): Promise<AppleCtx> {
  // help keep apple login visually apart from the other operations.
  Log.addNewLineIfNone();

  try {
    const authState = await loginAsync(
      {
        username: options.appleId,
        cookies: options.cookies,
        teamId: options.teamId,
      },
      {
        // TODO: Provide a way to disable this for users who want to mix and match teams / providers.
        autoResolveProvider: true,
      }
    );

    // Currently, this is resolved once, inside the apple-utils package.
    const teamId = authState.context.teamId!;
    // Get all of the teams to resolve the rest of the user data.
    // TODO: optimize this step.
    const teams = await Teams.getTeamsAsync();
    const team = teams.find(team => team.teamId === teamId);
    assert(team, `Your account is not associated with Apple Team with ID: ${teamId}`);

    // Get the JSON cookies in the custom YAML format used by Fastlane
    const fastlaneSession = Session.getSessionAsYAML();
    return {
      appleId: authState.username,
      appleIdPassword: authState.password,
      team: formatTeam(team),
      // Can be used to restore the auth state using apple-utils.
      authState,
      // Defined for legacy usage in Turtle V1 or any other places where Fastlane is used in the servers.
      fastlaneSession,
    };
  } catch (error) {
    if (error.message === 'ABORTED') {
      process.exit(1);
    }
    Log.log(chalk.red('Authentication with Apple Developer Portal failed!'));
    throw error;
  }
}

function formatTeam({ teamId, name, type }: Teams.AppStoreTeam): Team {
  return {
    id: teamId,
    name: `${name} (${type})`,
    inHouse: type.toLowerCase() === APPLE_IN_HOUSE_TEAM_TYPE,
  };
}
