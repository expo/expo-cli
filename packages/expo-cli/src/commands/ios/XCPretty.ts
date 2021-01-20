import { spawnAsync } from '@expo/xdl/build/detach/ExponentTools';
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

export function findBundleErrors(output: string): string | null {
  const tag = '@react-native-error-start';
  const indx = output.indexOf(tag);
  const endIndx = output.indexOf('@react-native-error-end');
  if (indx === -1 || endIndx === -1) return null;

  return output.slice(indx + tag.length, endIndx);
}
