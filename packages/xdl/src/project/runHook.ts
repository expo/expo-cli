import { ExpoConfig, Hook, HookArguments, HookType } from '@expo/config';
import decache from 'decache';
import resolveFrom from 'resolve-from';

import { Logger as logger, XDLError } from '../internal';

export type LoadedHook = Hook & {
  _fn: (input: HookArguments) => any;
};

function requireFromProject(projectRoot: string, modulePath: string) {
  try {
    const fullPath = resolveFrom(projectRoot, modulePath);
    // Clear the require cache for this module so get a fresh version of it
    // without requiring the user to restart Expo CLI
    decache(fullPath);
    return require(fullPath);
  } catch {
    return null;
  }
}

export function prepareHooks(hooks: ExpoConfig['hooks'], hookType: HookType, projectRoot: string) {
  const validHooks: LoadedHook[] = [];

  if (hooks) {
    if (hooks[hookType]) {
      hooks[hookType]!.forEach((hook: any) => {
        const { file } = hook;
        const fn = requireFromProject(projectRoot, file);
        if (typeof fn !== 'function') {
          logger.global.error(
            `Unable to load ${hookType} hook: '${file}'. The module does not export a function.`
          );
        } else {
          hook._fn = fn;
          validHooks.push(hook);
        }
      });
    }

    if (hooks[hookType] !== undefined && validHooks.length !== hooks[hookType]?.length) {
      throw new XDLError(
        'HOOK_INITIALIZATION_ERROR',
        `Please fix your ${hookType} hook configuration`
      );
    }
  }

  return validHooks;
}

export async function runHook(hook: LoadedHook, hookOptions: Omit<HookArguments, 'config'>) {
  let result = hook._fn({
    config: hook.config,
    ...hookOptions,
  });

  // If it's a promise, wait for it to resolve
  if (result && result.then) {
    result = await result;
  }

  if (result) {
    logger.global.info({ quiet: true }, result);
  }
}
