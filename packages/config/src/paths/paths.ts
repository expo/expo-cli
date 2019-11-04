import fs from 'fs-extra';
import path from 'path';
import findWorkspaceRoot from 'find-yarn-workspace-root';

import { readConfigJson, resolveModule } from '../Config';
import { getManagedExtensions } from './extensions';

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

// getEntryPoint('/', ['index', 'src/index'], ['web']);

export function getEntryPoint(
  projectRoot: string,
  entryFiles: string[],
  platforms: string[]
): string | null {
  const { exp, pkg } = readConfigJson(projectRoot, true, true);

  /**
   *  The main file is resolved like so:
   * * `app.json` -> `expo.entryPoint`
   * * `package.json` -> `"main"`
   * * `entryFiles`
   */
  if (exp && exp.entryPoint && typeof exp.entryPoint === 'string') {
    const entry = getAbsolutePathWithProjectRoot(projectRoot, exp.entryPoint);
    if (!fs.existsSync(entry))
      throw new Error(
        `Cannot resolve entry file: The \`expo.entryPoint\` field defined in your \`app.json\` points to a non-existent path.`
      );
    return entry;
  } else if (pkg) {
    const { main } = pkg;
    if (main && typeof main === 'string') {
      const entry = getAbsolutePathWithProjectRoot(projectRoot, main);
      if (!fs.existsSync(entry))
        throw new Error(
          `Cannot resolve entry file: The \`main\` field defined in your \`package.json\` points to a non-existent path.`
        );
      return entry;
    }
  }

  const extensions = getManagedExtensions(platforms);
  // Adds support for create-react-app (src/index.js) and react-native-cli (index.js) which don't define a main.
  for (const fileName of entryFiles) {
    for (const extension of extensions) {
      const filePath = getAbsolutePathWithProjectRoot(projectRoot, [fileName, extension].join('.'));
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  }

  // Fallback on expo/AppEntry
  const entryPoint = resolveModule('expo/AppEntry', projectRoot, exp);
  const expoEntryPointExists = fs.existsSync(entryPoint);

  if (!expoEntryPointExists) {
    throw new Error(
      `The project entry file could not be resolved. Please either define it in the \`package.json\` (main), \`app.json\` (expo.entryPoint), create an \`index.js\`, or install the \`expo\` package.`
    );
  }
  // Remove project root from file path
  return entryPoint.split(projectRoot).pop() || entryPoint;
}
