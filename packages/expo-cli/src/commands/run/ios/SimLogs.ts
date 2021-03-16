import chalk from 'chalk';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import wrapAnsi from 'wrap-ansi';

import Log from '../../../log';

const forks: Record<string, ChildProcessWithoutNullStreams> = {};

type SimLog = {
  /**
   * 258753568922927108
   */
  traceID: number;
  /**
   * "Connection 1: done",
   */
  eventMessage: string;
  /**
   * "logEvent" | "activityCreateEvent",
   */
  eventType: 'logEvent' | 'activityCreateEvent';
  source: null | {
    /**
     * 'RCTDefaultLogFunction_block_invoke' | '__TCC_CRASHING_DUE_TO_PRIVACY_VIOLATION__'
     */
    symbol: string;
    line: number;
    /**
     * 'TCC' | 'Security' | 'CFNetwork' | 'libnetwork.dylib' | 'myapp'
     *
     * TCC is apple sys, it means "Transparency, Consent, and Control"
     */
    image: string;
    /**
     * 'RCTLog.mm' | ''
     */
    file: string;
  };
  /**
   * "Connection %llu: done"
   */
  formatString: string;
  /**
   * 0
   */
  activityIdentifier: number;
  subsystem:
    | ''
    | 'com.apple.network'
    | 'com.facebook.react.log'
    | 'com.apple.TCC'
    | 'com.apple.CoreTelephony'
    | 'com.apple.WebKit'
    | 'com.apple.runningboard';
  category: '' | 'access' | 'connection';
  /**
   * "2021-03-15 15:36:28.004331-0700"
   */
  timestamp: string;
  /**
   * 706567072091713
   */
  machTimestamp: number;
  /**
   * "Default"
   */
  messageType: 'Default' | 'Error';
  /**
   * 15192
   */
  processID: number;
};

function parseMessageJson(data: Buffer) {
  const stringData = data.toString();
  try {
    return JSON.parse(stringData) as SimLog;
  } catch (e) {
    Log.debug('Failed to parse simctl JSON message:\n' + stringData);
  }
  return null;
}

// There are a lot of networking logs in RN that aren't relevant to the user.
function isNetworkLog(simLog: SimLog): boolean {
  return (
    simLog.subsystem === 'com.apple.network' ||
    simLog.category === 'connection' ||
    simLog.source?.image === 'CFNetwork'
  );
}

function isReactLog(simLog: SimLog): boolean {
  return simLog.subsystem === 'com.facebook.react.log' && simLog.source?.file === 'RCTLog.mm';
}

// It's not clear what these are but they aren't very useful.
// (The connection to service on pid 0 named com.apple.commcenter.coretelephony.xpc was invalidated)
// We can add them later if need.
function isCoreTelephonyLog(simLog: SimLog): boolean {
  // [CoreTelephony] Updating selectors failed with: Error Domain=NSCocoaErrorDomain Code=4099
  // "The connection to service on pid 0 named com.apple.commcenter.coretelephony.xpc was invalidated." UserInfo={NSDebugDescription=The connection to service on pid 0 named com.apple.commcenter.coretelephony.xpc was invalidated.}
  return simLog.subsystem === 'com.apple.CoreTelephony';
}

// https://stackoverflow.com/a/65313219/4047926
function isWebKitLog(simLog: SimLog): boolean {
  // [WebKit] 0x1143ca500 - ProcessAssertion: Failed to acquire RBS Background assertion 'WebProcess Background Assertion' for process with PID 27084, error: Error Domain=RBSAssertionErrorDomain Code=3 "Target is not running or required target
  // entitlement is missing" UserInfo={RBSAssertionAttribute=<RBSDomainAttribute| domain:"com.apple.webkit" name:"Background" sourceEnvironment:"(null)">, NSLocalizedFailureReason=Target is not running or required target entitlement is missing}
  return simLog.subsystem === 'com.apple.WebKit';
}

// Similar to WebKit logs
function isRunningBoardServicesLog(simLog: SimLog): boolean {
  // [RunningBoardServices] Error acquiring assertion: <Error Domain=RBSAssertionErrorDomain Code=3 "Target is not running or required target entitlement is missing" UserInfo={RBSAssertionAttribute=<RBSDomainAttribute| domain:"com.apple.webkit"
  // name:"Background" sourceEnvironment:"(null)">, NSLocalizedFailureReason=Target is not running or required target entitlement is missing}>
  return simLog.subsystem === 'com.apple.runningboard';
}

function formatMessage(simLog: SimLog): string {
  // TODO: Maybe change "TCC" to "Consent" or "System".
  const category = chalk.gray(`[${simLog.source?.image ?? simLog.subsystem}]`);
  const message = simLog.eventMessage;
  return wrapAnsi(category + ' ' + message, process.stdout.columns || 80);
}

// The primary purpose of this module is to surface logs related to fatal app crashes.
// Everything else should come through the native React logger.
export function streamLogs({ pid, udid }: { pid: string; udid?: string }): void {
  // xcrun simctl spawn booted log stream --process --style json
  forks[pid] = spawn('xcrun', [
    'simctl',
    'spawn',
    udid ?? 'booted',
    'log',
    'stream',
    '--process',
    pid,
    // ndjson provides a better format than json.
    '--style',
    'ndjson',
    // Provide the source so we can filter logs better
    '--source',
    // log, activity, trace -- activity was related to layouts, trace didn't work, so that leaves log.
    // Passing nothing combines all three, but we don't use activity.
    '--type',
    'log',
    // backtrace doesn't seem very useful in basic cases.
    // TODO: Maybe we can format as a stack trace for native errors.
    '--no-backtrace',
  ]);

  forks[pid].stdout.on('data', (data: Buffer) => {
    const simLog = parseMessageJson(data);
    if (!simLog) {
      return;
    }

    let hasLogged = false;

    if (simLog.messageType === 'Error') {
      if (
        // Hide all networking errors which are mostly useless.
        !isNetworkLog(simLog) &&
        // Showing React errors will result in duplicate messages.
        !isReactLog(simLog) &&
        !isCoreTelephonyLog(simLog) &&
        !isWebKitLog(simLog) &&
        !isRunningBoardServicesLog(simLog)
      ) {
        hasLogged = true;
        // Sim: This app has crashed because it attempted to access privacy-sensitive data without a usage description.  The app's Info.plist must contain an NSCameraUsageDescription key with a string value explaining to the user how the app uses this data.
        Log.nestedError(formatMessage(simLog));
      }
    } else {
      // If the source has a file (i.e. not a system log).
      if (simLog.source?.file) {
        hasLogged = true;
        Log.nested(formatMessage(simLog));
      }
    }

    if (!hasLogged) {
      Log.debug(formatMessage(simLog));
    } else {
      // console.log('DATA:', simLog);
    }
  });

  forks[pid].on('error', ({ message }) => {
    Log.debug('[simctl error]:', message);
  });

  // Ensure the process is removed.
  installExitHooks();
}

export async function detachStream(pid: string) {
  if (forks[pid]) {
    await killProcess(forks[pid]);
    delete forks[pid];
  }
}

function installExitHooks(): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, async () => {
      await Promise.all(Object.keys(forks).map(key => detachStream(key)));
    });
  }
}

async function killProcess(childProcess: ChildProcessWithoutNullStreams): Promise<void> {
  if (childProcess) {
    return new Promise<void>(resolve => {
      childProcess.on('close', resolve);
      childProcess.kill();
    });
  }
}
