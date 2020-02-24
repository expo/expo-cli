import path from 'path';
import fs from 'fs-extra';

import spawn from '@expo/spawn-async';

const binPaths: Record<string, string> = {
  win32: 'win64-bin/hermes.exe',
  linux: 'linux64-bin/hermes',
  darwin: 'osx-bin/hermes',
};

async function getBinForPlatform(projectRoot: string): Promise<string | null> {
  const binPath = binPaths[process.platform];
  if (!binPath) {
    throw new Error(`Unsupported platform ${process.platform}`);
  }

  const expoHermesPath = path.join(projectRoot, 'node_modules/@expo/hermes-engine', binPath);
  if (await fs.pathExists(expoHermesPath)) {
    return expoHermesPath;
  }

  const hermesEnginePath = path.join(projectRoot, 'node_modules/hermes-engine', binPath);
  if (await fs.pathExists(hermesEnginePath)) {
    return hermesEnginePath;
  }
  return null;
}

export async function tryGenerateBytecode(
  projectRoot: string,
  jsBundlePath: string,
  outputPath: string,
  flags: string[] = []
) {
  const hermesFlags = ['-O', ...flags];
  const binPath = await getBinForPlatform(projectRoot);
  if (!binPath) {
    return;
  }
  await spawn(binPath, ['-emit-binary', '-out', outputPath, jsBundlePath, ...hermesFlags], {
    stdio: 'pipe',
  });
}

export async function getBytecodeVersion(projectRoot: string) {
  const binPath = await getBinForPlatform(projectRoot);
  if (!binPath) {
    throw new Error('Hermes binnary not found');
  }
  const { stdout } = await spawn(binPath, ['--version'], { stdio: 'pipe' });
  const match = stdout.match(/HBC bytecode version: (\d+)/);
  const version = match?.[1];
  if (!version) {
    throw new Error('Unable to detect bytecode version');
  }
  return parseInt(version, 10);
}
