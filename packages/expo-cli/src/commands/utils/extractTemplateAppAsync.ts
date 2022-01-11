import { ExpoConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import merge from 'lodash/merge';
import path from 'path';

import { downloadAndExtractNpmModuleAsync, sanitizeNpmPackageName } from './npm';

/**
 * Extract a template app to a given file path and clean up any properties left over from npm to
 * prepare it for usage.
 */
export async function extractAndPrepareTemplateAppAsync(
  npmPackageName: string,
  projectRoot: string,
  config: { expo: Partial<ExpoConfig>; name?: string }
) {
  const name = config.name ?? config.expo.name ?? 'app';

  await downloadAndExtractNpmModuleAsync(npmPackageName, {
    cwd: projectRoot,
    name,
  });

  const appFile = new JsonFile(path.join(projectRoot, 'app.json'));
  const appJson = merge(await appFile.readAsync(), config);
  await appFile.writeAsync(appJson);

  await preparePackageJsonAsync(projectRoot, name);

  return projectRoot;
}

/** Modify the template package.json, removing any extra fields and adding known properties. */
async function preparePackageJsonAsync(projectRoot: string, appName: string) {
  const packageFile = new JsonFile(path.join(projectRoot, 'package.json'));
  const packageJson = await packageFile.readAsync();

  // Remove unused properties from package.json first.
  delete packageJson.description;
  delete packageJson.tags;
  delete packageJson.repository;

  // name and version are required for yarn workspaces (monorepos)
  packageJson.name = sanitizeNpmPackageName(appName);
  // These are metadata fields related to the template package, let's remove them from the package.json.
  // A good place to start
  packageJson.version = '1.0.0';
  packageJson.private = true;

  await packageFile.writeAsync(packageJson);
}
