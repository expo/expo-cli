import { fileExistsAsync } from '@expo/config';
import { sync as globSync } from 'glob';
import * as path from 'path';
import resolveFrom from 'resolve-from';

const requiredPackages = [
  // use typescript/package.json to skip node module cache issues when the user installs
  // the package and attempts to resolve the module in the same process.
  { file: 'typescript/package.json', pkg: 'typescript' },
  { file: '@types/react/index.d.ts', pkg: '@types/react' },
  { file: '@types/react-native/index.d.ts', pkg: '@types/react-native' },
];

export const baseTSConfigName = 'expo/tsconfig.base';

export function queryProjectTypeScriptFiles(projectRoot: string): string[] {
  return globSync('**/*.{ts,tsx}', {
    cwd: projectRoot,
    ignore: ['**/@(Carthage|Pods|node_modules)/**', '**/*.d.ts', '/{ios,android}/**'],
  });
}

export function resolveBaseTSConfig(projectRoot: string): string | null {
  try {
    return require.resolve('expo/tsconfig.base.json', { paths: [projectRoot] });
  } catch {
    return null;
  }
}

export async function hasTSConfig(projectRoot: string): Promise<string | null> {
  // TODO: Does this work in a monorepo?
  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
  if (await fileExistsAsync(tsConfigPath)) {
    return tsConfigPath;
  }
  return null;
}

export function collectMissingPackages(
  projectRoot: string
): {
  missing: {
    file: string;
    pkg: string;
  }[];
  resolutions: Record<string, string>;
} {
  const resolutions: Record<string, string> = {};

  const missingPackages = requiredPackages.filter(p => {
    try {
      resolutions[p.pkg] = resolveFrom(projectRoot, p.file);
      return false;
    } catch {
      return true;
    }
  });

  return { missing: missingPackages, resolutions };
}
