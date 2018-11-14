// Getting an undefined anywhere here probably means a ruby script is throwing an exception
import child_process from 'child_process';
import slash from 'slash';
import fs from 'fs-extra';
import { release, userInfo } from 'os';
import _ from 'lodash';

import prompt from '../../prompt';
import log from '../../log';

const FASTLANE =
  process.platform === 'darwin'
    ? require('@expo/traveling-fastlane-darwin')()
    : require('@expo/traveling-fastlane-linux')();

const WSL_BASH = 'C:\\Windows\\system32\\bash.exe';

const WSL_ONLY_PATH = 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

export const NO_BUNDLE_ID = 'App could not be found for bundle id';

export const APPLE_ERRORS = `If you get errors about

'Maximum number of certificates generated' or 'duplicate profiles'

then consider using the flags --revoke-apple-dist-certs, --revoke-apple-push-certs,
and --revoke-apple-provisioning-profile or go to developer.apple.com
and revoke those credentials manually
`;

export const MULTIPLE_PROFILES = 'Multiple profiles found with the name';

export const DEBUG = process.env.EXPO_DEBUG && process.env.EXPO_DEBUG === 'true';

const ENABLE_WSL = `
Does not seem like WSL enabled on this machine. Download from the Windows app
store a distribution of Linux, then in an admin powershell, please run:

Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux

and run the new Linux installation at least once
`;

export const doesFileProvidedExist = async (printOut, p12Path) => {
  try {
    const stats = await fs.stat(p12Path);
    return stats.isFile();
  } catch (e) {
    if (printOut) {
      console.log('\nFile does not exist.');
    }
    return false;
  }
};

export const doFastlaneActionsExist = async () => {
  return Promise.all(
    Object.keys(FASTLANE).map(async action => {
      let path = FASTLANE[action];
      return { action, path, doesExist: await doesFileProvidedExist(false, path) };
    })
  );
};

function appStoreAction(creds, metadata, teamId, action) {
  const args = [
    action,
    creds.appleId,
    creds.password,
    teamId,
    metadata.bundleIdentifier,
    metadata.experienceName,
    '[]',
    'false',
  ];
  return spawnAndCollectJSONOutputAsync(FASTLANE.app_management, args);
}

export function createAppOnPortal(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'create');
}

export function ensureAppIdLocally(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'verify');
}

export function produceProvisionProfile(
  credentials,
  { bundleIdentifier, distCertSerialNumber },
  teamId,
  isEnterprise
) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_new_provisioning_profile, [
    credentials.appleId,
    credentials.password,
    bundleIdentifier,
    teamId,
    distCertSerialNumber || '__last__',
    isEnterprise,
  ]);
}

export function producePushCerts(credentials, { bundleIdentifier }, teamId, isEnterprise) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_push_cert, [
    credentials.appleId,
    credentials.password,
    bundleIdentifier,
    teamId,
    isEnterprise,
  ]);
}

export function produceCerts(credentials, teamId, isEnterprise) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_cert, [
    credentials.appleId,
    credentials.password,
    teamId,
    isEnterprise,
  ]);
}

const NO_TEAM_ID = `You have no team ID associated with your apple account, cannot proceed.
(Do you have a paid Apple developer Account?)`;

export async function validateCredentialsProduceTeamId(creds) {
  const getTeamsAttempt = await spawnAndCollectJSONOutputAsync(
    FASTLANE.validate_apple_credentials,
    [creds.appleId, creds.password]
  );
  if (getTeamsAttempt.result === 'failure') {
    const { reason, rawDump } = getTeamsAttempt;
    // TODO: remove this after upgrading fastlane in @expo/traveling-fastlane-*
    findCommonFastlaneErrors(rawDump);
    throw new Error(`Reason:${reason}, raw:${JSON.stringify(rawDump)}`);
  }
  const { teams } = getTeamsAttempt;
  if (teams.length === 0) {
    throw new Error(NO_TEAM_ID);
  }
  if (teams.length === 1) {
    log(`Only 1 team associated with your account, using Team ID: ${teams[0].teamId}`);
    const [team] = teams;
    return {
      teamId: team.teamId,
      teamName: `${team.name} (${team.type})`,
    };
  } else {
    log(`You have ${teams.length} teams`);
    const teamChoices = teams.map(
      (team, i) => `${i + 1}) ${team['teamId']} "${team['name']}" (${team['type']})`
    );
    teamChoices.forEach(choice => console.log(choice));
    const answers = await prompt({
      type: 'list',
      name: 'choice',
      message: `Which Team ID to use?`,
      choices: teamChoices,
    });
    const chosenTeam = teams[teamChoices.indexOf(answers.choice)];
    return {
      teamId: chosenTeam.teamId,
      teamName: `${chosenTeam.name} (${chosenTeam.type})`,
    };
  }
}

// TODO: remove this after upgrading fastlane in @expo/traveling-fastlane-*
const findCommonFastlaneErrors = message => {
  if (message) {
    const lines = message.split('\n');
    const firstLineRaw = lines[0];
    // converting ruby hash to json
    const maybeJSON = firstLineRaw.replace(/=>/g, ':');
    const maybeObject = _.attempt(JSON.parse, maybeJSON);
    if (
      !_.isError(maybeObject) &&
      _.includes(['sa', 'hsa', 'non-sa', 'hsa2'], maybeObject.authType)
    ) {
      throw new Error(
        "Need to acknowledge to Apple's Apple ID and Privacy statement. Please manually log into https://appleid.apple.com (or https://itunesconnect.apple.com) to acknowledge the statement."
      );
    }
  }
};

const windowsToWSLPath = p => {
  const noSlashes = slash(p);
  return noSlashes.slice(2, noSlashes.length);
};

const MINUTES = 10;

const TIMEOUT = 60 * 1000 * MINUTES;

const timeout_msg = (prgm, args) =>
  process.platform === 'win32'
    ? `Took too long (limit is ${MINUTES} minutes) to execute ${prgm} ${args.join(' ')}.
Is your WSL working? in Powershell try: bash.exe -c 'uname'`
    : `Took too long (limit is ${MINUTES} minutes) to execute ${prgm} ${args.join(' ')}`;

const opts = { stdio: ['inherit', 'pipe', 'pipe'] };

export async function prepareLocalAuth() {
  if (DEBUG) {
    log.warn(APPLE_ERRORS);
  }

  if (process.platform === 'win32') {
    const [version] = release().match(/\d./);
    if (version !== '10') {
      log.warn('Must be on at least Windows version 10 for WSL support to work');
    }
    const { username } = userInfo();
    if (username && username.split(' ').length !== 1) {
      log.warn('Your username should not have empty space in it, exp might fail');
    }
    // Does bash.exe exist?
    try {
      await fs.access(WSL_BASH, fs.constants.F_OK);
    } catch (e) {
      log.warn(ENABLE_WSL);
    }
  }
}

type appManagementAction =
  | 'create'
  | 'verify'
  | 'revokeCerts'
  | 'dumpDistCert'
  | 'dumpPushCert'
  | 'revokeProvisioningProfile';

export async function revokeProvisioningProfile(creds, metadata, teamId) {
  const args = [
    ('revokeProvisioningProfile': appManagementAction),
    creds.appleId,
    creds.password,
    teamId,
    metadata.bundleIdentifier,
    metadata.experienceName,
    '[]',
    'false',
  ];
  return spawnAndCollectJSONOutputAsync(FASTLANE.app_management, args);
}

export async function askWhichCertsToDump(creds, metadata, teamId, distOrPush, isEnterprise) {
  const args = [
    (distOrPush === 'distCert' && 'dumpDistCert') || (distOrPush === 'pushCert' && 'dumpPushCert'),
    creds.appleId,
    creds.password,
    teamId,
    metadata.bundleIdentifier,
    metadata.experienceName,
    '[]',
    isEnterprise ? 'true' : 'false',
  ];
  const dumpExistingCertsAttempt = await spawnAndCollectJSONOutputAsync(
    FASTLANE.app_management,
    args
  );
  if (dumpExistingCertsAttempt.result === 'success') {
    const { certs } = dumpExistingCertsAttempt;
    const trimmedOneLiners = certs.map(s =>
      s
        .split('\n')
        .map(i => i.trim().replace(',', ''))
        .join(' ')
    );
    if (trimmedOneLiners.length === 0) {
      log.warn('No certs on developer.apple.com available to revoke');
      return [];
    }
    const { revokeTheseCerts } = await prompt({
      type: 'checkbox',
      name: 'revokeTheseCerts',
      message: `Which Certs to revoke?`,
      choices: trimmedOneLiners,
    });
    const certIds = revokeTheseCerts
      .map(s => trimmedOneLiners[trimmedOneLiners.indexOf(s)])
      .map(s => s.split(' ')[1].split('=')[1])
      .map(s => s.slice(1, s.length - 1));
    return certIds;
  } else {
    log.warn(
      `Unable to dump existing Apple Developer files: ${JSON.stringify(
        dumpExistingCertsAttempt.reason
      )}`
    );
    return [];
  }
}

export async function revokeCredentialsOnApple(creds, metadata, ids, teamId) {
  const args = [
    ('revokeCerts': appManagementAction),
    creds.appleId,
    creds.password,
    teamId,
    metadata.bundleIdentifier,
    metadata.experienceName,
  ];
  if (process.platform === 'win32') {
    args.push(ids.length === 0 ? '[]' : `[${ids.map(i => `\\"${i}\\"`).join(',')}]`);
  } else {
    args.push(ids.length === 0 ? '[]' : `[${ids.map(i => `"${i}"`).join(',')}]`);
  }

  return spawnAndCollectJSONOutputAsync(FASTLANE.app_management, args);
}

async function spawnAndCollectJSONOutputAsync(program, args) {
  let prgm = program;
  let cmd = args;
  let timeout;
  return Promise.race([
    new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(timeout_msg(prgm, cmd))), TIMEOUT);
    }),
    new Promise((resolve, reject) => {
      const jsonContent = [];
      try {
        if (process.platform === 'win32') {
          prgm = WSL_BASH;
          cmd = ['-c', `${WSL_ONLY_PATH} /mnt/c${windowsToWSLPath(program)} "${args.join(' ')}"`];
          if (DEBUG) {
            log.warn(`Running: bash.exe ${cmd.join(' ')}`);
          }
          var child = child_process.spawn(prgm, cmd, opts);
        } else {
          const wrapped = [`${cmd.join(' ')}`];
          var child = child_process.spawn(prgm, wrapped, opts);
        }
      } catch (e) {
        clearTimeout(timeout);
        return reject(e);
      }
      child.stdout.on('data', d => console.log(d.toString()));
      // This is where we get our replies back from the ruby code
      child.stderr.on('data', d => jsonContent.push(d));
      child.stdout.on('end', () => {
        const rawDump = Buffer.concat(jsonContent).toString();
        try {
          clearTimeout(timeout);
          resolve(JSON.parse(rawDump));
        } catch (e) {
          clearTimeout(timeout);
          reject({
            result: 'failure',
            reason: 'Could not understand JSON reply from Ruby based local auth scripts',
            rawDump,
          });
        }
      });
    }),
  ]);
}
