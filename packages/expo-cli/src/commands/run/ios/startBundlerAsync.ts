import { Project, ProjectSettings } from 'xdl';

import { getDevClientSchemeAsync } from '../../../schemes';
import * as TerminalUI from '../../start/TerminalUI';
import { installExitHooks } from '../../start/installExitHooks';

export async function startBundlerAsync(projectRoot: string) {
  // Add clean up hooks
  installExitHooks(projectRoot);
  // This basically means don't use the Client app.
  const devClient = true;
  const scheme = await getDevClientSchemeAsync(projectRoot).catch(() => null);
  await ProjectSettings.setAsync(projectRoot, {
    devClient,
    scheme,
  });
  await Project.startAsync(projectRoot, { devClient });
  await TerminalUI.startAsync(projectRoot, {
    devClient,
    isWebSocketsEnabled: true,
    isRemoteReloadingEnabled: true,
  });
}
