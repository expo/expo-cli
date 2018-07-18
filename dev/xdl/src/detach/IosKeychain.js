import uuidv1 from 'uuid/v1';
import _ from 'lodash';
import fs from 'fs-extra';

import _logger from './Logger';
import { spawnAsyncThrowError, createSpawner } from './ExponentTools';

export async function createKeychain(appUUID, saveResultToFile = true) {
  const BUILD_PHASE = 'creating keychain';
  const logger = _logger.withFields({ buildPhase: BUILD_PHASE });
  const spawn = createSpawner(BUILD_PHASE, logger);

  const name = uuidv1();
  const password = uuidv1();
  const path = getKeychainPath(name);

  logger.info('creating new keychain...');
  await runFastlane([
    'run',
    'create_keychain',
    `path:${path}`,
    `password:${password}`,
    'unlock:true',
    'timeout:360000',
  ]);
  await spawn('security', 'show-keychain-info', path, { stdoutOnly: true });

  logger.info('created new keychain');
  const keychainInfo = {
    name,
    path,
    password,
  };

  if (saveResultToFile) {
    const keychainInfoPath = getKeychainInfoPath(appUUID);
    await fs.writeFile(keychainInfoPath, JSON.stringify(keychainInfo));
    logger.info('saved keychain info to %s', keychainInfoPath);
  }

  return keychainInfo;
}

export async function deleteKeychain({ path, appUUID }) {
  const BUILD_PHASE = 'deleting keychain';
  const logger = _logger.withFields({ buildPhase: BUILD_PHASE });

  logger.info('deleting keychain...');
  await runFastlane(['run', 'delete_keychain', `keychain_path:${path}`]);

  if (appUUID) {
    const keychainInfoPath = getKeychainInfoPath(appUUID);
    await fs.remove(keychainInfoPath);
  }
}

export async function importIntoKeychain({ keychainPath, certPath, certPassword }) {
  const BUILD_PHASE = 'importing certificate into keychain';
  const logger = _logger.withFields({ buildPhase: BUILD_PHASE });
  const spawn = createSpawner(BUILD_PHASE);

  logger.info('importing certificate into keychain...');
  const args = ['import', certPath, '-A', '-k', keychainPath, '-f', 'pkcs12'];
  if (certPassword) {
    logger.info('certificate has password');
    args.push('-P', certPassword);
  } else {
    logger.info("certificate doesn't have password");
  }
  await spawn('security', ...args);
  logger.info('imported certificate into keychain');
}

export async function cleanUpKeychains() {
  try {
    _logger.info('Cleaning up keychains...');
    const { stdout: keychainsListRaw } = await spawnAsyncThrowError(
      'security',
      ['list-keychains'],
      { stdio: 'pipe' }
    );
    const allKeychainsList = keychainsListRaw.match(/"(.*)"/g).map(i => i.slice(1, i.length - 1));
    const turtleKeychainsList = keychainsListRaw.match(/\/private\/tmp\/xdl\/(.*).keychain/g);
    let shouldCleanSearchList = false;
    if (turtleKeychainsList) {
      for (const keychainPath of turtleKeychainsList) {
        try {
          await deleteKeychain({ path: keychainPath });
        } catch (err) {
          _logger.warn(`Failed to delete keychain: ${keychainPath}`, err);
          shouldCleanSearchList = true;
        }
      }

      if (shouldCleanSearchList) {
        const newSearchList = _.difference(allKeychainsList, turtleKeychainsList);
        await spawnAsyncThrowError('security', ['list-keychains', '-s', ...newSearchList], {
          stdio: 'pipe',
        });
      }
    }
    _logger.info('Cleaned up keychains');
  } catch (err) {
    _logger.error(err);
    throw new Error('Failed to clean up keychains');
  }
}

async function runFastlane(fastlaneArgs) {
  const fastlaneEnvVars = {
    FASTLANE_DISABLE_COLORS: 1,
    FASTLANE_SKIP_UPDATE_CHECK: 1,
    CI: 1,
    LC_ALL: 'en_US.UTF-8',
  };
  await spawnAsyncThrowError('fastlane', fastlaneArgs, {
    env: { ...process.env, ...fastlaneEnvVars },
  });
}

const getKeychainPath = name => `/private/tmp/xdl/${name}.keychain`;
const getKeychainInfoPath = appUUID => `/private/tmp/${appUUID}-keychain-info.json`;
