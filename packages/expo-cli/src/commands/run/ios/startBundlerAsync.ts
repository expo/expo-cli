import { Project, ProjectSettings } from 'xdl';

import * as TerminalUI from '../../start/TerminalUI';
import { installExitHooks } from '../../start/installExitHooks';
import { getOptionalDevClientSchemeAsync } from '../utils/schemes';

export async function setGlobalDevClientSettingsAsync(projectRoot: string) {
  const devClient = true;
  const scheme = await getOptionalDevClientSchemeAsync(projectRoot).catch(() => null);
  await ProjectSettings.setAsync(projectRoot, {
    devClient,
    scheme,
  });
}

export async function startBundlerAsync(
  projectRoot: string,
  { metroPort, platforms }: Pick<Project.StartOptions, 'metroPort' | 'platforms'>
) {
  // Add clean up hooks
  installExitHooks(projectRoot);
  // This basically means don't use the Client app.
  const devClient = true;
  await Project.startAsync(projectRoot, { devClient, metroPort });
  await TerminalUI.startAsync(projectRoot, {
    devClient,
    // Enable controls
    isWebSocketsEnabled: true,
    isRemoteReloadingEnabled: true,
    platforms,
  });
}
