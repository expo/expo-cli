import JsonFile from '@expo/json-file';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import fs from 'fs-extra';
import path from 'path';

import { ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';
import { projectHasModule } from './Modules';

export function isUsingYarn(projectRoot: string): boolean {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  if (workspaceRoot) {
    return fs.existsSync(path.join(workspaceRoot, 'yarn.lock'));
  } else {
    return fs.existsSync(path.join(projectRoot, 'yarn.lock'));
  }
}

export function getExpoSDKVersion(projectRoot: string, exp: ExpoConfig): string {
  if (exp && exp.sdkVersion) {
    return exp.sdkVersion;
  }
  const packageJsonPath = projectHasModule('expo/package.json', projectRoot, exp);
  if (packageJsonPath) {
    const expoPackageJson = JsonFile.read(packageJsonPath, { json5: true });
    const { version: packageVersion } = expoPackageJson;
    if (typeof packageVersion === 'string') {
      const majorVersion = packageVersion.split('.').shift();
      return `${majorVersion}.0.0`;
    }
  }
  throw new ConfigError(
    `Cannot determine which native SDK version your project uses because the module \`expo\` is not installed. Please install it with \`yarn add expo\` and try again.`,
    'MODULE_NOT_FOUND'
  );
}
