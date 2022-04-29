import spawnAsync from '@expo/spawn-async';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Stream } from 'stream';
import tar from 'tar';
import { promisify } from 'util';

import { createEntryResolver, createFileTransform } from './createFileTransform';
import { createFetch } from './fetch';

type ExtractProps = {
  name: string;
  cwd: string;
  strip?: number;
  fileList?: string[];
};

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
