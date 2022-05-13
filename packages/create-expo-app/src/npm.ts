import spawnAsync from '@expo/spawn-async';
import fs from 'fs';
import getenv from 'getenv';
import os from 'os';
import path from 'path';
import { Stream } from 'stream';
import tar from 'tar';
import { promisify } from 'util';

import { createEntryResolver, createFileTransform } from './createFileTransform';
import { createFetch } from './fetch';
import { ALIASES } from './legacyTemplates';

type ExtractProps = {
  name: string;
  cwd: string;
  strip?: number;
  fileList?: string[];
};

function isBeta() {
  return getenv.boolish('EXPO_BETA', false);
}

/** Applies the `@beta` npm tag when `EXPO_BETA` is enabled. */
export function applyBetaTag(npmPackageName: string): string {
  let [name, tag] = splitNpmNameAndTag(npmPackageName);

  if (!tag && isBeta()) {
    tag = 'beta';
  }

  return joinNpmNameAndTag(name, tag);
}

/** Join an NPM package name and tag together, stripping the tag if it's `undefined`. */
function joinNpmNameAndTag(name: string, tag: string | undefined): string {
  return [name, tag].filter(Boolean).join('@');
}

/** Split a package name from its tag. */
export function splitNpmNameAndTag(npmPackageName: string): [string, string | undefined] {
  const components = npmPackageName.split('@').filter(Boolean);

  if (npmPackageName.startsWith('@')) {
    return ['@' + components[0], components[1]];
  }

  return [components[0], components[1]];
}

/**
 * Applies known shortcuts to an NPM package name and tag.
 * - If the name is `blank`, `blank-typescript`, `tabs`, or `bare-minimum`, apply the prefix `expo-template-`.
 * - If a tag is a numeric value like `45`, and the name is a known template, then convert the tag to `sdk-X`.
 *
 * @example `blank@45` => `expo-template-blank@sdk-45`
 */
export function getResolvedTemplateName(npmPackageName: string) {
  let [name, tag] = splitNpmNameAndTag(npmPackageName);

  if (name.startsWith('@')) {
    return npmPackageName;
  }

  const aliasPrefix = 'expo-template-';

  if (ALIASES.includes(aliasPrefix + name)) {
    name = aliasPrefix + name;
  }

  // Only apply the numeric conversion if the name is a known template.
  if (ALIASES.includes(name)) {
    if (tag?.match(/^\d+$/)) {
      return name + '@sdk-' + tag;
    }
  }

  return joinNpmNameAndTag(name, tag);
}

// @ts-ignore
const pipeline = promisify(Stream.pipeline);

const cachedFetch = createFetch({
  cacheDirectory: 'template-cache',
  // Set no timeout on the templates since they're versioned already.
});

export function applyKnownNpmPackageNameRules(name: string): string | null {
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

export async function extractLocalNpmTarballAsync(
  tarFilePath: string,
  props: ExtractProps
): Promise<void> {
  const readStream = fs.createReadStream(tarFilePath);
  await extractNpmTarballAsync(readStream, props);
}

export function getCacheFilePath(subdir: string = 'template-cache') {
  return path.join(os.homedir(), 'create-expo-app', subdir);
}

async function getNpmUrlAsync(packageName: string): Promise<string> {
  const url = (await spawnAsync('npm', ['v', packageName, 'dist.tarball'])).stdout;

  if (!url) {
    throw new Error(`Could not get npm url for package "${packageName}"`);
  }

  return url;
}

export async function downloadAndExtractNpmModule(
  root: string,
  npmName: string,
  projectName: string
): Promise<void> {
  const url = await getNpmUrlAsync(npmName);

  await extractNpmTarballFromUrlAsync(url, {
    cwd: root,
    name: projectName,
  });
}

export async function createUrlStreamAsync(url: string) {
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

  await fs.promises.mkdir(cwd, { recursive: true });

  await pipeline(
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
