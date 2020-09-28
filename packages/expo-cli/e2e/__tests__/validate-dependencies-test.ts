import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { createMinimalProjectAsync, EXPO_CLI, minimumNativePkgJson } from '../TestUtils';

const tempDir = temporary.directory();

beforeAll(async () => {
  jest.setTimeout(30000);
  await fs.mkdirp(tempDir);
});

function executeCommand(cwd: string, args: string[]) {
  const promise = spawnAsync(EXPO_CLI, args, { cwd });

  if (!process.env.CI) {
    promise.child.stdout.pipe(process.stdout);
    promise.child.stderr.pipe(process.stderr);
  }

  return promise;
}

describe('validate-dependencies', () => {
  it('exits with a non-zero code if project dependencies are not compatible', async () => {
    expect.assertions(4);

    const projectRoot = await createMinimalProjectAsync(tempDir, 'validate-dependencies-test');

    const cleanCmd = await executeCommand(projectRoot, ['validate-dependencies']);
    expect(cleanCmd.status).toEqual(0);
    expect(cleanCmd.stdout).toMatch(/Dependencies appear to be compatible/);

    const incompatiblePkgJson = {
      ...minimumNativePkgJson,
      dependencies: {
        ...minimumNativePkgJson.dependencies,
        'expo-application': '0.0.0',
      },
    };
    fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(incompatiblePkgJson));

    try {
      await executeCommand(projectRoot, ['validate-dependencies']);
    } catch (errorCmd) {
      expect(errorCmd.stderr).toMatch(/your project's dependencies are not compatible/);
      expect(errorCmd.status).toEqual(1);
    }
  });
});
