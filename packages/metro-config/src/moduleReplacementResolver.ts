import fs from 'fs';
import { CustomResolver, Resolution } from 'metro-resolver';
import path from 'path';
import resolveFrom from 'resolve-from';

import { EXPO_DEBUG } from './env';
import { escapeRegExp } from './escapeRegExp';
import { importMetroResolverFromProject } from './importMetroFromProject';

export type ModuleReplacement = { match: RegExp; replace: string };

export function createModuleReplacementResolver(
  projectRoot: string,
  moduleReplacements: ModuleReplacement[]
): CustomResolver | undefined {
  if (!moduleReplacements.length) {
    return undefined;
  }
  const { resolve } = importMetroResolverFromProject(projectRoot);

  return (context, realModuleName, platform) => {
    const defaultResolveRequest = context.resolveRequest;
    delete context.resolveRequest;

    try {
      const result: Resolution = resolve(context, realModuleName, platform);

      // Only apply resolution on source files, skipping noop and assets
      if (result.type === 'sourceFile') {
        // Iterate through the replacements
        for (const matcher of moduleReplacements) {
          if (matcher.match.test(result.filePath)) {
            if (EXPO_DEBUG) {
              console.log(`[emc] Replace: `, result.filePath, ' -> ', matcher.replace);
            }
            // @ts-ignore: readonly
            result.filePath = matcher.replace;
          }
        }
      }

      return result;
    } catch (e) {
      throw e;
    } finally {
      context.resolveRequest = defaultResolveRequest;
    }
  };
}

function getAllFiles(dirPath: string, collected: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    const joined = path.join(dirPath, file);
    if (fs.statSync(joined).isDirectory()) {
      collected = getAllFiles(joined, collected);
    } else {
      collected.push(joined);
    }
  });

  return collected;
}

// We replace modules in `expo/patches/*` in the project.
// This is used for applying patches to the upstream `react-native` package.
export function getVendoredExpoPatches(projectRoot: string): ModuleReplacement[] {
  // Get the `expo/patches` folder if it exists.
  let expoPatchesPath: string = '';
  try {
    expoPatchesPath = path.join(
      path.dirname(resolveFrom(projectRoot, 'expo/package.json')),
      'patches'
    );
  } catch {}

  if (!expoPatchesPath || !fs.existsSync(expoPatchesPath)) {
    if (EXPO_DEBUG) {
      console.log('[emc] expo/patches folder not found, skipping patches');
    }
    return [];
  }

  // Collect all of the patches.
  const patches = getAllFiles(expoPatchesPath).map(replace => ({
    match: new RegExp(escapeRegExp(path.relative(expoPatchesPath, replace))),
    replace,
  }));

  if (EXPO_DEBUG) {
    console.log('[emc] using patches:', patches);
  }
  return patches;
}
