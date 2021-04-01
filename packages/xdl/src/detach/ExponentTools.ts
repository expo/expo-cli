import { ExpoConfig } from '@expo/config';
import spawnAsyncQuiet, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';

import { LoggerDetach, pipeOutputToLogger, XDLError } from '../internal';

async function saveUrlToPathAsync(url: string, path: string, timeout = 20000) {
  const response = await axios.get(url, { responseType: 'stream', timeout });

  return new Promise(function (resolve, reject) {
    const stream = fs.createWriteStream(path);
    stream.on('close', resolve);
    stream.on('error', reject);
    response.data.on('error', reject).pipe(stream);
  });
}

async function getManifestAsync(url: string, headers: any, options: any = {}) {
  const buildPhaseLogger =
    options.logger || LoggerDetach.withFields({ buildPhase: 'reading manifest' });

  let response;
  try {
    response = await _retryPromise(() => axios.get(url.replace('exp://', 'http://'), { headers }));
  } catch (err) {
    buildPhaseLogger.error(err);
    throw new Error('Failed to fetch manifest from www');
  }

  buildPhaseLogger.info('Using manifest:', JSON.stringify(response.data, null, 2));
  return response.data;
}

async function _retryPromise<T>(fn: (...args: any[]) => T, retries = 5): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries-- > 0) {
      return await _retryPromise(fn, retries);
    } else {
      throw err;
    }
  }
}

export type AsyncSpawnOptions = SpawnOptions & {
  loggerFields?: any;
  pipeToLogger?: boolean | { stdout?: boolean; stderr?: boolean };
  stdoutOnly?: boolean;
  loggerLineTransformer?: (line: any) => any;
};

async function spawnAsyncThrowError(
  command: string,
  args: string[],
  options: AsyncSpawnOptions = {
    stdio: 'inherit',
    cwd: process.cwd(),
  }
): Promise<SpawnResult> {
  const { pipeToLogger } = options;
  if (pipeToLogger) {
    options.stdio = 'pipe';
    options.cwd = options.cwd || process.cwd();
  }
  const promise = spawnAsyncQuiet(command, args, options);
  if (pipeToLogger && promise.child) {
    const streams: { stdout?: Readable | null; stderr?: Readable | null } = {};
    if (pipeToLogger === true || pipeToLogger.stdout) {
      streams.stdout = promise.child.stdout;
    }
    if (pipeToLogger === true || pipeToLogger.stderr) {
      streams.stderr = promise.child.stderr;
    }
    pipeOutputToLogger(streams, options.loggerFields, options);
  }
  return promise;
}

async function spawnAsync(
  command: string,
  args: string[],
  options: SpawnOptions
): Promise<SpawnResult | void> {
  try {
    return await spawnAsyncThrowError(command, args, options);
  } catch (e) {
    LoggerDetach.error(e.message);
  }
}

function isDirectory(dir: string) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

type LocaleMap = { [lang: string]: any };

async function getResolvedLocalesAsync(projectRoot: string, exp: ExpoConfig): Promise<LocaleMap> {
  const locales: LocaleMap = {};
  if (exp.locales !== undefined) {
    for (const [lang, localePath] of Object.entries(exp.locales)) {
      const s = await fs.readFile(path.resolve(projectRoot, localePath as string), 'utf8');
      try {
        locales[lang] = JSON.parse(s);
      } catch (e) {
        throw new XDLError('INVALID_JSON', JSON.stringify(e));
      }
    }
  }
  return locales;
}

async function regexFileAsync(
  regex: RegExp | string,
  replace: string,
  filename: string
): Promise<void> {
  const file = await fs.readFile(filename);
  const fileString = file.toString();
  await fs.writeFile(filename, fileString.replace(regex, replace));
}

// Matches sed /d behavior
async function deleteLinesInFileAsync(
  startRegex: RegExp | string,
  endRegex: RegExp | string,
  filename: string
): Promise<void> {
  const file = await fs.readFile(filename);
  const fileString = file.toString();
  const lines = fileString.split(/\r?\n/);
  const filteredLines = [];
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
  saveUrlToPathAsync,
  getManifestAsync,
  spawnAsyncThrowError,
  spawnAsync,
  getResolvedLocalesAsync,
  regexFileAsync,
  deleteLinesInFileAsync,
};
