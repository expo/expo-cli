import { readExpRcAsync } from '@expo/config';
import ngrok from '@expo/ngrok';
import delayAsync from 'delay-async';
import * as path from 'path';
import { promisify } from 'util';

import * as Android from '../Android';
import Config from '../Config';
import * as Exp from '../Exp';
import * as ProjectSettings from '../ProjectSettings';
import * as UrlUtils from '../UrlUtils';
import UserManager, { ANONYMOUS_USERNAME } from '../User';
import UserSettings from '../UserSettings';
import XDLError from '../XDLError';
import * as Logger from './ProjectUtils';
import { assertValidProjectRoot } from './errors';

const ngrokConnectAsync = promisify(ngrok.connect);

const ngrokKillAsync = promisify(ngrok.kill);

function getNgrokConfigPath() {
  return path.join(UserSettings.dotExpoHomeDirectory(), 'ngrok.yml');
}

async function connectToNgrokAsync(
  projectRoot: string,
  args: ngrok.NgrokOptions,
  hostnameAsync: () => Promise<string>,
  ngrokPid: number | null | undefined,
  attempts: number = 0
): Promise<string> {
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
            Logger.logDebug(projectRoot, 'expo', `Couldn't kill ngrok with PID ${ngrokPid}`);
          }
        } else {
          await ngrokKillAsync();
        }
      } else {
        // Change randomness to avoid conflict if killing ngrok didn't help
        await Exp.resetProjectRandomnessAsync(projectRoot);
      }
    } // Wait 100ms and then try again
    await delayAsync(100);
    return connectToNgrokAsync(projectRoot, args, hostnameAsync, null, attempts + 1);
  }
}

const TUNNEL_TIMEOUT = 10 * 1000;

export async function startTunnelsAsync(projectRoot: string): Promise<void> {
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
    Logger.logInfo(
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
        {
          authtoken: Config.ngrok.authToken,
          port: expoServerPort,
          proto: 'http',
        },
        async () => {
          const randomness = expRc.manifestTunnelRandomness
            ? expRc.manifestTunnelRandomness
            : await Exp.getProjectRandomnessAsync(projectRoot);
          return [
            randomness,
            UrlUtils.domainify(username),
            UrlUtils.domainify(packageShortName),
            Config.ngrok.domain,
          ].join('.');
        },
        packagerInfo.ngrokPid
      );
      const packagerNgrokUrl = await connectToNgrokAsync(
        projectRoot,
        {
          authtoken: Config.ngrok.authToken,
          port: packagerInfo.packagerPort,
          proto: 'http',
        },
        async () => {
          const randomness = expRc.manifestTunnelRandomness
            ? expRc.manifestTunnelRandomness
            : await Exp.getProjectRandomnessAsync(projectRoot);
          return [
            'packager',
            randomness,
            UrlUtils.domainify(username),
            UrlUtils.domainify(packageShortName),
            Config.ngrok.domain,
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

      Logger.logWithLevel(
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
          Logger.logError(
            projectRoot,
            'expo',
            'We noticed your tunnel is having issues. ' +
              'This may be due to intermittent problems with our tunnel provider. ' +
              'If you have trouble connecting to your app, try to Restart the project, ' +
              'or switch Host to LAN.'
          );
        } else if (status === 'online') {
          Logger.logInfo(projectRoot, 'expo', 'Tunnel connected.');
        }
      });
    })(),
  ]);
}

export async function stopTunnelsAsync(projectRoot: string): Promise<void> {
  assertValidProjectRoot(projectRoot);
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
      Logger.logDebug(projectRoot, 'expo', `Couldn't kill ngrok with PID ${packagerInfo.ngrokPid}`);
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
