// Getting an undefined anywhere here probably means a ruby script is throwing an exception
import child_process from 'child_process';
import slash from 'slash';
import spawnAsync from '@expo/spawn-async';
import { basename } from 'path';
import inquirer from 'inquirer';
import fs from 'fs-extra';

import log from '../../log';

const FASTLANE =
  process.platform === 'darwin'
    ? require('@expo/traveling-fastlane-darwin')()
    : require('@expo/traveling-fastlane-linux')();

const WSL_BASH = 'C:\\Windows\\system32\\bash.exe';

const WSL_ONLY_PATH = 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

export const NO_BUNDLE_ID = 'App could not be found for bundle id';

export const MULTIPLE_PROFILES = 'Multiple profiles found with the name';

const DEBUG = process.env.EXPO_DEBUG;

const ENABLE_WSL = `
Does not seem like WSL enabled on this machine. In an admin powershell, please run:
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
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
  ];
  return spawnAndCollectJSONOutputAsync(FASTLANE.app_management, args);
}

export function createAppOnPortal(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'create');
}

export function ensureAppIdLocally(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'verify');
}

export function produceProvisionProfile(credentials, { bundleIdentifier }, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_new_provisioning_profile, [
    credentials.appleId,
    credentials.password,
    bundleIdentifier,
    teamId,
  ]);
}

export function producePushCerts(credentials, { bundleIdentifier }, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_push_cert, [
    credentials.appleId,
    credentials.password,
    bundleIdentifier,
    teamId,
  ]);
}

export function produceCerts(credentials, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_cert, [
    credentials.appleId,
    credentials.password,
    teamId,
  ]);
}

export async function validateCredentialsProduceTeamId(creds) {
  const getTeamsAttempt = await spawnAndCollectJSONOutputAsync(
    FASTLANE.validate_apple_credentials,
    [creds.appleId, creds.password]
  );
  if (DEBUG) {
    console.log({ action: 'teams attempt retrieval', dump: getTeamsAttempt });
  }
  if (getTeamsAttempt.result === 'failure') {
    const { reason, rawDump } = getTeamsAttempt;
    throw new Error(`Reason:${reason}, raw:${JSON.stringify(rawDump)}`);
  }
  const { teams } = getTeamsAttempt;
  if (teams.length === 0) {
    throw new Error('You have no team ID associated with your apple account, cannot proceed');
  }
  log(`You have ${teams.length} teams`);
  if (teams.length === 1) {
    console.log(`Only 1 team associated with your account, using Team ID: ${teams[0].teamId}`);
    return { teamId: teams[0].teamId };
  } else {
    const teamChoices = teams.map(
      (team, i) => `${i + 1}) ${team['teamId']} "${team['name']}" (${team['type']})`
    );
    teamChoices.forEach(choice => console.log(choice));
    const answers = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: `Which Team ID to use?`,
      choices: teamChoices,
    });
    return { teamId: teams[teamChoices.indexOf(answers.choice)].teamId };
  }
}

const windowsToWSLPath = p => {
  const noSlashes = slash(p);
  return noSlashes.slice(2, noSlashes.length);
};

let fastlaneScratchPad = null;

export async function cleanUp() {
  if (process.platform === 'win32' && fastlaneScratchPad !== null) {
    await spawnAsync(WSL_BASH, ['-c', `rm -rf ${fastlaneScratchPad}`]);
  }
}

export async function prepareLocalAuth() {
  if (process.platform === 'win32') {
    try {
      await fs.access(WSL_BASH, fs.constants.F_OK);
    } catch (e) {
      log.warn(ENABLE_WSL);
      throw e;
    }
    let tmpDir = null;
    try {
      tmpDir = await spawnAsync(WSL_BASH, ['-c', 'mktemp -d']);
      // Possible that bash.exe exists but still no WSL implementation is available
    } catch (e) {
      const { stdout } = e;
      throw new Error(`Issue running WSL, please fix as appropriate: ${stdout.replace(/\0/g, '')}`);
    }
    const tmp = tmpDir.stdout.trim();
    const cmd = `cp -R '/mnt/c${windowsToWSLPath(FASTLANE.ruby_dir)}' ${tmp}/fastlane`;
    await spawnAsync(WSL_BASH, ['-c', cmd]);
    fastlaneScratchPad = `${tmp}/fastlane`;
  }
}

async function spawnAndCollectJSONOutputAsync(program, args) {
  return new Promise((resolve, reject) => {
    const jsonContent = [];
    const opts = { stdio: ['inherit', 'pipe', 'pipe'] };
    try {
      if (process.platform === 'win32') {
        const script = basename(program);
        const cmd = ['-c', `${WSL_ONLY_PATH} ${fastlaneScratchPad}/${script} ${args.join(' ')}`];
        var child = child_process.spawn(WSL_BASH, cmd, opts);
      } else {
        var child = child_process.spawn(program, args, opts);
      }
    } catch (e) {
      return reject(e);
    }
    child.stdout.on('data', d => console.log(d.toString()));
    // This is where we get our replies back from the ruby code
    child.stderr.on('data', d => jsonContent.push(d));
    child.stdout.on('end', () => {
      const reply = Buffer.concat(jsonContent).toString();
      try {
        resolve(JSON.parse(reply));
      } catch (e) {
        reject({
          result: 'failure',
          reason: 'Could not understand JSON reply from Ruby local auth scripts',
          rawDump: reply,
        });
      }
    });
  });
}
