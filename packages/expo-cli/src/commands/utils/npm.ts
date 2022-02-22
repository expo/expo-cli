import { JSONArray, JSONObject, JSONValue } from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import slugify from 'slugify';
import { Stream } from 'stream';
import tar from 'tar';
import { promisify } from 'util';
import { UserSettings } from 'xdl';

import Log from '../../log';
import { createEntryResolver, createFileTransform } from './createFileTransform';
import { FileSystemCache } from './fetch-cache/FileSystemCache';
import createFetchWithCache from './fetch-cache/fetch';

const cachedFetch = createFetchWithCache(
  new FileSystemCache({
    cacheDirectory: getCacheFilePath(),
    // Time to live. How long (in ms) responses remain cached before being automatically ejected. If undefined, responses are never automatically ejected from the cache.
    // ttl: 1000,
  })
);

export function sanitizeNpmPackageName(name: string): string {
  // https://github.com/npm/validate-npm-package-name/#naming-rules
  return (
    applyKnownNpmPackageNameRules(name) ||
    applyKnownNpmPackageNameRules(slugify(name)) ||
    // If nothing is left use 'app' like we do in Xcode projects.
    'app'
  );
}

function applyKnownNpmPackageNameRules(name: string): string | null {
  // https://github.com/npm/validate-npm-package-name/#naming-rules

  // package name cannot start with '.' or '_'.
  while (/^(\.|_)/.test(name)) {
    name = name.substring(1);
  }

  name = name.toLowerCase().replace(/[^a-zA-Z0-9._\-/@]/g, '');

  return (
    name
      // .replace(/![a-z0-9-._~]+/g, '')
      // Remove special characters
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') || null
  );
}

export async function npmPackAsync(
  packageName: string,
  cwd: string | undefined = undefined,
  ...props: string[]
): Promise<JSONValue> {
  const cmd = ['pack', packageName, ...props];

  const cmdString = `npm ${cmd.join(' ')}`;
  Log.debug('Run:', cmdString);
  const results = (await spawnAsync('npm', [...cmd, '--json'], { cwd })).stdout?.trim();

  if (!results) {
    return null;
  }
  try {
    return JSON.parse(results);
  } catch (error: any) {
    throw new Error(
      `Could not parse JSON returned from "${cmdString}".\n\n${results}\n\nError: ${error.message}`
    );
  }
}

// @ts-ignore
const pipeline = promisify(Stream.pipeline);

export async function downloadAndExtractNpmModuleAsync(
  npmName: string,
  props: ExtractProps
): Promise<void> {
  Log.debug(`Looking for tarball for ${npmName} in ${getCacheFilePath()}...`);
  try {
    const cachePath = getCacheFilePath();
    // Perform dry-run to get actual filename for resolved version
    const filename = (((await npmPackAsync(
      npmName,
      cachePath,
      '--dry-run'
    )) as JSONArray)[0] as JSONObject).filename as string;

    const cacheFilename = path.join(cachePath, filename);

    // TODO: This cache does not expire, but neither does the FileCache at the top of this file.
    if (!(await fs.stat(cacheFilename).catch(() => null))?.isFile() ?? false) {
      Log.debug(`Downloading tarball for ${npmName} to ${cachePath}...`);
      await npmPackAsync(npmName, cachePath);
    }
    await extractLocalNpmTarballAsync(cacheFilename, {
      cwd: props.cwd,
      name: props.name,
    });
  } catch (error) {
    Log.error('Error downloading and extracting template package');
  }
}

export async function extractLocalNpmTarballAsync(
  tarFilePath: string,
  props: ExtractProps
): Promise<void> {
  const readStream = fs.createReadStream(tarFilePath);
  await extractNpmTarballAsync(readStream, props);
}

type ExtractProps = {
  name: string;
  cwd: string;
  strip?: number;
  fileList?: string[];
};

function getCacheFilePath() {
  return path.join(UserSettings.dotExpoHomeDirectory(), 'template-cache');
}

async function createUrlStreamAsync(url: string) {
  const response = await cachedFetch(url);
  if (!response.ok) {
    throw new Error(`Unexpected response: ${response.statusText}. From url: ${url}`);
  }

  return response.body;
}

export async function extractNpmTarballFromUrlAsync(
  url: string,
  props: ExtractProps
): Promise<void> {
  await extractNpmTarballAsync(await createUrlStreamAsync(url), props);
}

export async function extractNpmTarballAsync(
  stream: NodeJS.ReadableStream,
  props: ExtractProps
): Promise<void> {
  const { cwd, strip, name, fileList = [] } = props;

  await fs.ensureDir(cwd);

  return pipeline(
    stream,
    tar.extract(
      {
        cwd,
        transform: createFileTransform(name),
        onentry: createEntryResolver(name),
        strip: strip ?? 1,
      },
      fileList
    )
  );
}
