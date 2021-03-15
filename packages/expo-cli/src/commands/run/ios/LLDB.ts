import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

const lldbForks: Record<string, ChildProcessWithoutNullStreams> = {};

export function attachNativeDebugger(appId: string, pid: string): void {
  lldbForks[appId] = spawn('lldb', ['-p', pid]);
  // Pipe the native logs to the main process.
  lldbForks[appId].stdout.pipe(process.stdout);
  lldbForks[appId].stderr.pipe(process.stderr);
  // Tell the process to continue.
  lldbForks[appId].stdin.write('process continue\n');

  // Ensure we unmount LLDB or the simulator will get in a bad state.
  installExitHooks();
}

function installExitHooks(): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, async () => {
      await Promise.all(Object.keys(lldbForks).map(key => detachNativeDebugger(key)));
    });
  }
}

export async function detachNativeDebugger(appId: string) {
  if (lldbForks[appId]) {
    lldbForks[appId].stdin.write('process detach\n');
    await killProcess(lldbForks[appId]);
    delete lldbForks[appId];
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
