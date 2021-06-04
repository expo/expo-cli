import type { Platform, ProjectTarget } from '@expo/config';
import { getConfig } from '@expo/config';
import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import type { composeSourceMaps } from 'metro-source-map';
import os from 'os';
import path from 'path';
import process from 'process';
import resolveFrom from 'resolve-from';

export async function shouldBuildHermesBundleAsync(
  projectRoot: string,
  target: ProjectTarget,
  platform: Platform
): Promise<boolean> {
  if (target === 'managed') {
    const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
    switch (platform) {
      case 'android':
        return exp.android?.jsEngine === 'hermes';
      default:
        return false;
    }
  }

  if (target === 'bare') {
    switch (platform) {
      case 'android':
        return isHermesEnabledForBareAndroidAsync(projectRoot);
      default:
        return false;
    }
  }

  return false;
}

interface HermesBundleOutput {
  hbc: Uint8Array;
  sourcemap: string;
}
export async function buildHermesBundleAsync(
  projectRoot: string,
  code: string,
  map: string,
  optimize: boolean = false
): Promise<HermesBundleOutput> {
  const tempDir = path.join(os.tmpdir(), `expo-bundler-${process.pid}`);
  await fs.ensureDir(tempDir);
  try {
    const tempBundleFile = path.join(tempDir, 'index.bundle');
    const tempSourcemapFile = path.join(tempDir, 'index.bundle.map');
    await fs.writeFile(tempBundleFile, code);
    await fs.writeFile(tempSourcemapFile, map);

    const tempHbcFile = path.join(tempDir, 'index.hbc');
    const hermesCommand = getHermesCommand(projectRoot);
    const args = ['-emit-binary', '-out', tempHbcFile, tempBundleFile, '-output-source-map'];
    if (optimize) {
      args.push('-O');
    }
    await spawnAsync(hermesCommand, args);

    const [hbc, sourcemap] = await Promise.all([
      fs.readFile(tempHbcFile),
      createHermesSourcemapAsync(projectRoot, map, `${tempHbcFile}.map`),
    ]);
    return {
      hbc,
      sourcemap,
    };
  } finally {
    await fs.remove(tempDir);
  }
}

export async function createHermesSourcemapAsync(
  projectRoot: string,
  sourcemap: string,
  hermesMapFile: string
): Promise<string> {
  const composeSourceMaps = importMetroSourceMapFromProject(projectRoot);
  const bundlerSourcemap = JSON.parse(sourcemap);
  const hermesSourcemap = await fs.readJSON(hermesMapFile);
  return JSON.stringify(composeSourceMaps([bundlerSourcemap, hermesSourcemap]));
}

function getHermesCommand(projectRoot: string): string {
  const platform = getHermesCommandPlatform();
  const resolvedPath = resolveFrom.silent(projectRoot, `hermes-engine/${platform}/hermesc`);
  if (!resolvedPath) {
    throw new Error(
      `Missing module "hermes-engine/${platform}/hermesc" in the project.` +
        'This usually means hermes-engine is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  return resolvedPath;
}

function getHermesCommandPlatform(): string {
  switch (os.platform()) {
    case 'darwin':
      return 'osx-bin';
    case 'linux':
      return 'linux64-bin';
    case 'win32':
      return 'win64-bin';
    default:
      throw new Error(`Unsupported host platform for Hermes compiler: ${os.platform()}`);
  }
}

export function parseGradleProperties(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (let line of content.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const sepIndex = line.indexOf('=');
    const key = line.substr(0, sepIndex);
    const value = line.substr(sepIndex + 1);
    result[key] = value;
  }
  return result;
}

async function isHermesEnabledForBareAndroidAsync(projectRoot: string): Promise<boolean> {
  const gradlePropertiesPath = path.join(projectRoot, 'android', 'gradle.properties');
  if (fs.existsSync(gradlePropertiesPath)) {
    const props = parseGradleProperties(await fs.readFile(gradlePropertiesPath, 'utf8'));
    return props['export.jsEngine'] === 'hermes';
  }
  return false;
}

function importMetroSourceMapFromProject(projectRoot: string): typeof composeSourceMaps {
  const resolvedPath = resolveFrom.silent(projectRoot, 'metro-source-map/src/composeSourceMaps');
  if (!resolvedPath) {
    throw new Error(
      'Missing module "metro-source-map/src/composeSourceMaps" in the project. ' +
        'This usually means React Native is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  return require(resolvedPath);
}

// https://github.com/facebook/hermes/blob/release-v0.5/include/hermes/BCGen/HBC/BytecodeFileFormat.h#L24-L25
const HERMES_MAGIC_HEADER = 'c61fbc03c103191f';

export async function isHermesBytecodeBundleAsync(file: string): Promise<boolean> {
  const header = await readHermesHeaderAsync(file);
  return header.slice(0, 8).toString('hex') === HERMES_MAGIC_HEADER;
}

export async function getHermesBytecodeBundleVersionAsync(file: string): Promise<number> {
  const header = await readHermesHeaderAsync(file);
  if (header.slice(0, 8).toString('hex') !== HERMES_MAGIC_HEADER) {
    throw new Error('Invalid hermes bundle file');
  }
  return header.readUInt32LE(8);
}

async function readHermesHeaderAsync(file: string): Promise<Buffer> {
  const fd = await fs.open(file, 'r');
  const buffer = Buffer.alloc(12);
  await fs.read(fd, buffer, 0, 12, null);
  await fs.close(fd);
  return buffer;
}
