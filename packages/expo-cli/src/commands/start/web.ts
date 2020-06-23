import { Project } from '@expo/xdl';

import urlOpts from '../../urlOpts';
import * as TerminalUI from './TerminalUI';

import configureProjectAsync from './configureProjectAsync';
import { normalizeOptionsAsync, parseStartOptions } from './options';
import { NormalizedOptions, Options } from './types';

export default async function startWeb(projectDir: string, options: Options) {
  await startWebAction(
    projectDir,
    await normalizeOptionsAsync(projectDir, { ...options, webOnly: true })
  );
}

export async function startWebAction(
  projectDir: string,
  options: NormalizedOptions
): Promise<void> {
  const { exp, rootPath } = await configureProjectAsync(projectDir, options);
  const startOpts = parseStartOptions(options);
  await Project.startAsync(rootPath, startOpts);
  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!options.nonInteractive && !exp.isDetached) {
    await TerminalUI.startAsync(projectDir, startOpts);
  }
}
