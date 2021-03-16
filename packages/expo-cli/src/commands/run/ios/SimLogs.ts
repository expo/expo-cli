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
  subsystem: '' | 'com.apple.network' | 'com.apple.TCC';
  category: '' | 'access' | 'connection';
  //   "threadID" : 4892623,
  //   "senderImageUUID" : "C5384B45-5DAF-315D-B984-9E30E9AF4B3A",
  //   "backtrace" : {
  //     "frames" : [
  //       {
  //         "imageOffset" : 677763,
  //         "imageUUID" : "C5384B45-5DAF-315D-B984-9E30E9AF4B3A"
  //       }
  //     ]
  //   },
  //   "bootUUID" : "",
  //   "processImagePath" : "\/Users\/evanbacon\/Library\/Developer\/CoreSimulator\/Devices\/AE226061-B435-4AFD-A6CF-01AD00CE40D3\/data\/Containers\/Bundle\/Application\/A6412127-9D3C-4169-896A-C27D155E7F10\/yolo8.app\/yolo8",
  /**
   * "2021-03-15 15:36:28.004331-0700"
   */
  timestamp: string;
  //   "senderImagePath" : "\/Applications\/Xcode.app\/Contents\/Developer\/Platforms\/iPhoneOS.platform\/Library\/Developer\/CoreSimulator\/Profiles\/Runtimes\/iOS.simruntime\/Contents\/Resources\/RuntimeRoot\/System\/Library\/Frameworks\/CFNetwork.framework\/CFNetwork",
  /**
   * 706567072091713
   */
  machTimestamp: number;
  /**
   * "Default"
   */
  messageType: 'Default' | 'Error';
  //   "processImageUUID" : "0A4AC852-7CF1-3D33-9136-4F4D9CE8080F",
  /**
   * 15192
   */
  processID: number;
  //   "senderProgramCounter" : 677763,
  //   "parentActivityIdentifier" : 0,
  //   "timezoneName" : ""
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

function formatMessage(simLog: SimLog): string {
  // TODO: Maybe change "TCC" to "Consent" or "System".
  const category = chalk.gray(`[${simLog.source?.image ?? simLog.subsystem}]`);
  const message = simLog.eventMessage;
  return wrapAnsi(category + ' ' + message, process.stdout.columns || 80);
}

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
      // Hide all networking errors
      if (!isNetworkLog(simLog)) {
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

function installExitHooks(): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, async () => {
      await Promise.all(Object.keys(forks).map(key => detachStream(key)));
    });
  }
}

export async function detachStream(pid: string) {
  if (forks[pid]) {
    await killProcess(forks[pid]);
    delete forks[pid];
  }
}

export async function killProcess(childProcess: ChildProcessWithoutNullStreams): Promise<void> {
  if (childProcess) {
    return new Promise<void>((resolve, reject) => {
      childProcess.on('close', resolve);
      childProcess.kill();
    });
  }
}
