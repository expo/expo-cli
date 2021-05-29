import { readExpRcAsync } from '@expo/config';
import * as path from 'path';
import { promisify } from 'util';

import {
  Android,
  ANONYMOUS_USERNAME,
  assertValidProjectRoot,
  delayAsync,
  NgrokOptions,
  ProjectSettings,
  ProjectUtils,
  resolveNgrokAsync,
  UrlUtils,
  UserManager,
  UserSettings,
  XDLError,
} from '../internal';

const NGROK_CONFIG = {
  authToken: '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',
  authTokenPublicId: '5W1bR67GNbWcXqmxZzBG1',
  domain: 'exp.direct',
};

function getNgrokConfigPath() {
  return path.join(UserSettings.dotExpoHomeDirectory(), 'ngrok.yml');
}

async function getProjectRandomnessAsync(projectRoot: string) {
  const ps = await ProjectSettings.readAsync(projectRoot);
  const randomness = ps.urlRandomness;
  if (randomness) {
    return randomness;
  } else {
    return resetProjectRandomnessAsync(projectRoot);
  }
}

async function resetProjectRandomnessAsync(projectRoot: string) {
  const randomness = UrlUtils.someRandomness();
  ProjectSettings.setAsync(projectRoot, { urlRandomness: randomness });
  return randomness;
}

async function connectToNgrokAsync(
  projectRoot: string,
  ngrok: any,
  args: NgrokOptions,
  hostnameAsync: () => Promise<string>,
  ngrokPid: number | null | undefined,
  attempts: number = 0
): Promise<string> {
  const ngrokConnectAsync = promisify(ngrok.connect);
  const ngrokKillAsync = promisify(ngrok.kill);

  try {
    const configPath = getNgrokConfigPath();
    const hostname = await hostnameAsync();
    const url = await ngrokConnectAsync({
      hostname,
      configPath,
      ...args,
    });
    return url;
  } catch (e) {
    // Attempt to connect 3 times
    if (attempts >= 2) {
      if (e.message) {
        throw new XDLError('NGROK_ERROR', e.toString());
      } else {
        throw new XDLError('NGROK_ERROR', JSON.stringify(e));
      }
    }
    if (!attempts) {
      attempts = 0;
    } // Attempt to fix the issue
    if (e.error_code && e.error_code === 103) {
      if (attempts === 0) {
        // Failed to start tunnel. Might be because url already bound to another session.
        if (ngrokPid) {
          try {
            process.kill(ngrokPid, 'SIGKILL');
          } catch (e) {
            ProjectUtils.logDebug(projectRoot, 'expo', `Couldn't kill ngrok with PID ${ngrokPid}`);
          }
        } else {
          await ngrokKillAsync();
        }
      } else {
        // Change randomness to avoid conflict if killing ngrok didn't help
        await resetProjectRandomnessAsync(projectRoot);
      }
    } // Wait 100ms and then try again
    await delayAsync(100);
    return connectToNgrokAsync(projectRoot, ngrok, args, hostnameAsync, null, attempts + 1);
  }
}

const TUNNEL_TIMEOUT = 10 * 1000;

export async function startTunnelsAsync(
  projectRoot: string,
  options: { autoInstall?: boolean } = {}
): Promise<void> {
  const ngrok = await resolveNgrokAsync(projectRoot, options);

  const username = (await UserManager.getCurrentUsernameAsync()) || ANONYMOUS_USERNAME;
  assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    throw new XDLError('NO_PACKAGER_PORT', `No packager found for project at ${projectRoot}.`);
  }
  if (!packagerInfo.expoServerPort) {
    throw new XDLError(
      'NO_EXPO_SERVER_PORT',
      `No Expo server found for project at ${projectRoot}.`
    );
  }
  const expoServerPort = packagerInfo.expoServerPort;
  await stopTunnelsAsync(projectRoot);
  if (await Android.startAdbReverseAsync(projectRoot)) {
    ProjectUtils.logInfo(
      projectRoot,
      'expo',
      'Successfully ran `adb reverse`. Localhost URLs should work on the connected Android device.'
    );
  }
  const packageShortName = path.parse(projectRoot).base;
  const expRc = await readExpRcAsync(projectRoot);

  let startedTunnelsSuccessfully = false;

  // Some issues with ngrok cause it to hang indefinitely. After
  // TUNNEL_TIMEOUTms we just throw an error.
  await Promise.race([
    (async () => {
      await delayAsync(TUNNEL_TIMEOUT);
      if (!startedTunnelsSuccessfully) {
        throw new Error('Starting tunnels timed out');
      }
    })(),
    (async () => {
      const expoServerNgrokUrl = await connectToNgrokAsync(
        projectRoot,
        ngrok,
        {
          authtoken: NGROK_CONFIG.authToken,
          port: expoServerPort,
          proto: 'http',
        },
        async () => {
          const randomness = expRc.manifestTunnelRandomness
            ? expRc.manifestTunnelRandomness
            : await getProjectRandomnessAsync(projectRoot);
          return [
            randomness,
            UrlUtils.domainify(username),
            UrlUtils.domainify(packageShortName),
            NGROK_CONFIG.domain,
          ].join('.');
        },
        packagerInfo.ngrokPid
      );
      const packagerNgrokUrl = await connectToNgrokAsync(
        projectRoot,
        ngrok,
        {
          authtoken: NGROK_CONFIG.authToken,
          port: packagerInfo.packagerPort,
          proto: 'http',
        },
        async () => {
          const randomness = expRc.manifestTunnelRandomness
            ? expRc.manifestTunnelRandomness
            : await getProjectRandomnessAsync(projectRoot);
          return [
            'packager',
            randomness,
            UrlUtils.domainify(username),
            UrlUtils.domainify(packageShortName),
            NGROK_CONFIG.domain,
          ].join('.');
        },
        packagerInfo.ngrokPid
      );
      await ProjectSettings.setPackagerInfoAsync(projectRoot, {
        expoServerNgrokUrl,
        packagerNgrokUrl,
        ngrokPid: ngrok.process().pid,
      });

      startedTunnelsSuccessfully = true;

      ProjectUtils.logWithLevel(
        projectRoot,
        'info',
        {
          tag: 'expo',
          _expoEventType: 'TUNNEL_READY',
        },
        'Tunnel ready.'
      );

      ngrok.addListener('statuschange', (status: string) => {
        if (status === 'reconnecting') {
          ProjectUtils.logError(
            projectRoot,
            'expo',
            'We noticed your tunnel is having issues. ' +
              'This may be due to intermittent problems with our tunnel provider. ' +
              'If you have trouble connecting to your app, try to Restart the project, ' +
              'or switch Host to LAN.'
          );
        } else if (status === 'online') {
          ProjectUtils.logInfo(projectRoot, 'expo', 'Tunnel connected.');
        }
      });
    })(),
  ]);
}

export async function stopTunnelsAsync(projectRoot: string): Promise<void> {
  assertValidProjectRoot(projectRoot);
  const ngrok = await resolveNgrokAsync(projectRoot, { shouldPrompt: false }).catch(() => null);
  if (!ngrok) {
    return;
  }
  const ngrokKillAsync = promisify(ngrok.kill);

  // This will kill all ngrok tunnels in the process.
  // We'll need to change this if we ever support more than one project
  // open at a time in XDE.
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  const ngrokProcess = ngrok.process();
  const ngrokProcessPid = ngrokProcess ? ngrokProcess.pid : null;
  ngrok.removeAllListeners('statuschange');
  if (packagerInfo.ngrokPid && packagerInfo.ngrokPid !== ngrokProcessPid) {
    // Ngrok is running in some other process. Kill at the os level.
    try {
      process.kill(packagerInfo.ngrokPid);
    } catch (e) {
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `Couldn't kill ngrok with PID ${packagerInfo.ngrokPid}`
      );
    }
  } else {
    // Ngrok is running from the current process. Kill using ngrok api.
    await ngrokKillAsync();
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerNgrokUrl: null,
    packagerNgrokUrl: null,
    ngrokPid: null,
  });
  await Android.stopAdbReverseAsync(projectRoot);
}
