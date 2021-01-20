import spawnAsync from '@expo/spawn-async';
import { spawn } from 'child_process';

export async function isXCPrettyInstalledAsync(): Promise<boolean> {
  try {
    await spawnAsync('xcpretty', ['--version'], { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

export async function forkXCPrettyAsync() {
  if (await isXCPrettyInstalledAsync) {
    return spawn('xcpretty', [], {
      stdio: ['pipe', process.stdout, process.stderr],
    });
  }
  return null;
}
