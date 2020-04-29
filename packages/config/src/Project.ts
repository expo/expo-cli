import JsonFile from '@expo/json-file';
import { ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';
import { projectHasModule } from './Modules';

export function getExpoSDKVersion(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'sdkVersion' | 'nodeModulesPath'>
): string {
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
