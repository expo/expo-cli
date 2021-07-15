import type { Command } from 'commander';

import { profileMethod } from '../utils/profileMethod';

export { Command };

export function applyAsyncActionProjectDir<Options = Record<string, any>>(
  command: Command,
  resolve: () => Promise<{ actionAsync: (projectRoot: string, options: Options) => Promise<void> }>,
  settings?: { checkConfig?: boolean }
) {
  command.asyncActionProjectDir(async (projectRoot: string, options: Options) => {
    const mod = await resolve();
    return profileMethod(mod.actionAsync)(projectRoot, options);
  }, settings);
}

export function applyAsyncAction<Options = Record<string, any>>(
  command: Command,
  resolve: () => Promise<{ actionAsync: (args: string[], options: Options) => Promise<void> }>
) {
  command.asyncAction(async (args: string[], options: Options) => {
    const mod = await resolve();
    return profileMethod(mod.actionAsync)(args, options);
  });
}
