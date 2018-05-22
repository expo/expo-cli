// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs-extra';
import path from 'path';
import Request from 'request-promise-native';
// `request-promise-native` discourages using pipe. Noticed some issues with
// error handling so when using pipe use the original request lib instead.
import pipeRequest from 'request';
import rimraf from 'rimraf';
import spawnAsyncQuiet from '@expo/spawn-async';
import _ from 'lodash';

import logger, { pipeOutputToLogger } from './Logger';
import XDLError from '../XDLError';
import ErrorCode from '../ErrorCode';

const request = Request.defaults({
  resolveWithFullResponse: true,
});

function _getFilesizeInBytes(path) {
  let stats = fs.statSync(path);
  let fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

function parseSdkMajorVersion(expSdkVersion) {
  // We assume that the unversioned SDK is the latest
  if (expSdkVersion === 'UNVERSIONED') {
    return Infinity;
  }

  let sdkMajorVersion = 0;
  try {
    let versionComponents = expSdkVersion.split('.').map(number => parseInt(number, 10));
    sdkMajorVersion = versionComponents[0];
  } catch (_) {}
  return sdkMajorVersion;
}

function saveUrlToPathAsync(url, path) {
  return new Promise(function(resolve, reject) {
    let stream = fs.createWriteStream(path);
    stream.on('close', () => {
      if (_getFilesizeInBytes(path) < 10) {
        throw new Error(`{filename} is too small`);
      }
      resolve();
    });
    stream.on('error', reject);
    pipeRequest(url).pipe(stream);
  });
}

function saveImageToPathAsync(projectRoot, pathOrURL, outPath) {
  const localPath = path.resolve(projectRoot, pathOrURL);
  return new Promise(function(resolve, reject) {
    let stream = fs.createWriteStream(outPath);
    stream.on('close', () => {
      if (_getFilesizeInBytes(outPath) < 10) {
        throw new Error(`{filename} is too small`);
      }
      resolve();
    });
    stream.on('error', reject);
    if (fs.existsSync(localPath)) {
      fs.createReadStream(localPath).pipe(stream);
    } else {
      pipeRequest(pathOrURL).pipe(stream);
    }
  });
}

async function getManifestAsync(url, headers) {
  const buildPhaseLogger = logger.withFields({ buildPhase: 'reading manifest' });
  const requestOptions = {
    url: url.replace('exp://', 'http://') + '/index.exp',
    headers,
  };

  const response = await request(requestOptions);
  const responseBody = response.body;
  buildPhaseLogger.info('Using manifest:', responseBody);
  let manifest;
  try {
    manifest = JSON.parse(responseBody);
  } catch (e) {
    throw new Error(`Unable to parse manifest: ${e}`);
  }

  return manifest;
}

async function spawnAsyncThrowError(...args) {
  if (args.length === 2) {
    return spawnAsyncQuiet(args[0], args[1], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } else {
    const options = args[2];
    const { pipeToLogger } = options;
    if (pipeToLogger) {
      options.stdio = 'pipe';
      options.cwd = options.cwd || process.cwd();
    }
    const promise = spawnAsyncQuiet(...args);
    if (pipeToLogger && promise.child) {
      const streamsKeys = _.isObject(pipeToLogger)
        ? _.keys(_.pickBy(pipeToLogger, _.identity))
        : ['stdout', 'stderr'];
      const streamsToLogs = _.pick(promise.child, streamsKeys);
      pipeOutputToLogger(streamsToLogs, options.loggerFields, options);
    }
    return promise;
  }
}

async function spawnAsync(...args) {
  try {
    return await spawnAsyncThrowError(...args);
  } catch (e) {
    logger.error(e.message);
  }
}

function createSpawner(buildPhase, logger) {
  return (command, ...args) => {
    const lastArg = _.last(args);
    const optionsFromArg = _.isObject(lastArg) ? args.pop() : {};

    const options = { ...optionsFromArg, pipeToLogger: true };
    if (buildPhase) {
      options.loggerFields = options.loggerFields ? options.loggerFields : {};
      options.loggerFields = { ...options.loggerFields, buildPhase };
    }

    if (logger) {
      logger.info('Executing command:', command, ...args);
    }
    return spawnAsyncThrowError(command, args, options);
  };
}

async function transformFileContentsAsync(filename, transform) {
  let fileString = await fs.readFile(filename, 'utf8');
  let newFileString = transform(fileString);
  if (newFileString !== null) {
    await fs.writeFile(filename, newFileString);
  }
}

function manifestUsesSplashApi(manifest, platform) {
  if (platform === 'ios') {
    return manifest.splash || (manifest.ios && manifest.ios.splash);
  }
  if (platform === 'android') {
    return manifest.splash || (manifest.android && manifest.android.splash);
  }
  return false;
}

function rimrafDontThrow(directory) {
  try {
    rimraf.sync(directory);
  } catch (e) {
    logger.warn(
      `There was an issue cleaning up, but your project should still work. You may need to manually remove ${directory}. (${e})`
    );
  }
}

function isDirectory(dir) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

async function getResolvedLocalesAsync(inMemoryManifest) {
  const locales = {};
  if (inMemoryManifest.locales !== undefined) {
    for (const [lang, path] of Object.entries(inMemoryManifest.locales)) {
      const s = await fs.readFile(path, 'utf8');
      try {
        locales[lang] = JSON.parse(s);
      } catch (e) {
        throw new XDLError(ErrorCode.INVALID_JSON, JSON.stringify(e));
      }
    }
  }
  return locales;
}

async function regexFileAsync(regex, replace, filename) {
  let file = await fs.readFile(filename);
  let fileString = file.toString();
  await fs.writeFile(filename, fileString.replace(regex, replace));
}

// Matches sed /d behavior
async function deleteLinesInFileAsync(startRegex, endRegex, filename) {
  let file = await fs.readFile(filename);
  let fileString = file.toString();
  let lines = fileString.split(/\r?\n/);
  let filteredLines = [];
  let inDeleteRange = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(startRegex)) {
      inDeleteRange = true;
    }

    if (!inDeleteRange) {
      filteredLines.push(lines[i]);
    }

    if (inDeleteRange && lines[i].match(endRegex)) {
      inDeleteRange = false;
    }
  }
  await fs.writeFile(filename, filteredLines.join('\n'));
}

export {
  isDirectory,
  parseSdkMajorVersion,
  saveUrlToPathAsync,
  saveImageToPathAsync,
  getManifestAsync,
  rimrafDontThrow,
  spawnAsyncThrowError,
  spawnAsync,
  transformFileContentsAsync,
  manifestUsesSplashApi,
  getResolvedLocalesAsync,
  regexFileAsync,
  deleteLinesInFileAsync,
  createSpawner,
};
