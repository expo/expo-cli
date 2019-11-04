import fs from 'fs-extra';
import path from 'path';
import findWorkspaceRoot from 'find-yarn-workspace-root';

import resolveFrom from 'resolve-from';
import { readConfigJson, resolveModule } from '../Config';
import { getManagedExtensions } from './extensions';

// https://github.com/facebook/create-react-app/blob/9750738cce89a967cc71f28390daf5d4311b193c/packages/react-scripts/config/paths.js#L22
export function ensureSlash(inputPath: string, needsSlash: boolean): string {
  const hasSlash = inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return inputPath.substr(0, inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${inputPath}/`;
  } else {
    return inputPath;
  }
}

export function getModulesPath(projectRoot: string): string {
  const workspaceRoot = findWorkspaceRoot(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'node_modules');
  }

  return path.resolve(projectRoot, 'node_modules');
}

export function getPossibleProjectRoot(): string {
  return fs.realpathSync(process.cwd());
}

export function getAbsolutePathWithProjectRoot(
  projectRoot: string,
  ...pathComponents: string[]
): string {
  // Simple check if we are dealing with an URL
  if (pathComponents && pathComponents.length === 1 && pathComponents[0].startsWith('http')) {
    return pathComponents[0];
  }

  return path.resolve(projectRoot, ...pathComponents);
}

// getEntryPoint('/', ['./index', './src/index'], ['web']);

export function getEntryPoint(
  projectRoot: string,
  entryFiles: string[],
  platforms: string[]
): string | null {
  const extensions = getManagedExtensions(platforms);
  return getEntryPointWithExtensions(projectRoot, entryFiles, extensions);
}

/**
 *  The main file is resolved like so:
 * * `app.json: expo.entryPoint`
 * * `package.json: main`
 * * `entryFiles[]`
 */

// Used to resolve the main entry file for a project.
export function getEntryPointWithExtensions(
  projectRoot: string,
  entryFiles: string[],
  extensions: string[]
): string {
  const { exp, pkg } = readConfigJson(projectRoot, true, true);

  // This will first look in the `app.json`s `expo.entryPoint` field for a potential main file.
  // We check the Expo config first in case you want your project to start differently with Expo then in a standalone environment.
  if (exp && exp.entryPoint && typeof exp.entryPoint === 'string') {
    // If the field exists then we want to test it against every one of the supplied extensions
    // to ensure the bundler resolves the same way.
    const entry = resolveFromSilentWithExtensions(projectRoot, exp.entryPoint, extensions);
    if (!entry)
      throw new Error(
        `Cannot resolve entry file: The \`expo.entryPoint\` field defined in your \`app.json\` points to a non-existent path.`
      );
    return entry;
  } else if (pkg) {
    // If the config doesn't define a custom entry then we want to look at the `package.json`s `main` field, and try again.
    const { main } = pkg;
    if (main && typeof main === 'string') {
      // Testing the main field against all of the provided extensions.
      const entry = resolveFromSilentWithExtensions(projectRoot, main, extensions);

      if (!entry)
        throw new Error(
          `Cannot resolve entry file: The \`main\` field defined in your \`package.json\` points to a non-existent path.`
        );
      return entry;
    }
  }

  // Now we will start looking for a default entry point using the provided `entryFiles` argument.
  // This will add support for create-react-app (src/index.js) and react-native-cli (index.js) which don't define a main.
  for (const fileName of entryFiles) {
    const entry = resolveFromSilentWithExtensions(projectRoot, fileName, extensions);
    if (entry) return entry;
  }

  try {
    // If none of the default files exist then we will attempt to use the main Expo entry point.
    // This requires `expo` to be installed in the project to work as it will use `node_module/expo/AppEntry.js`
    // Doing this enables us to create a bare minimum Expo project.

    // TODO(Bacon): We may want to do a check against `./App` and `expo` in the `package.json` `dependencies` as we can more accurately ensure that the project is expo-min without needing the modules installed.
    return resolveModule('expo/AppEntry', projectRoot, exp);
  } catch (_) {
    throw new Error(
      `The project entry file could not be resolved. Please either define it in the \`package.json\` (main), \`app.json\` (expo.entryPoint), create an \`index.js\`, or install the \`expo\` package.`
    );
  }
}

// Resolve from but with the ability to resolve like a bundler
export function resolveFromSilentWithExtensions(
  fromDirectory: string,
  moduleId: string,
  extensions: string[]
): string | undefined {
  for (const extension of extensions) {
    const modulePath = resolveFrom.silent(fromDirectory, `${moduleId}.${extension}`);
    if (modulePath && modulePath.endsWith(extension)) {
      return modulePath;
    }
  }
  return resolveFrom.silent(fromDirectory, moduleId);
}
