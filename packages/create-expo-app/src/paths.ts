import { homedir } from 'os';
import * as path from 'path';

// copied from https://github.com/expo/eas-cli/blob/f0c958e58bc7aa90ee8f822e075d40703563708e/packages/eas-cli/src/utils/paths.ts

// The ~/.expo directory is used to store authentication sessions,
// which are shared between EAS CLI and Expo CLI.
function dotExpoHomeDirectory(): string {
  const home = homedir();
  if (!home) {
    throw new Error(
      "Can't determine your home directory; make sure your $HOME environment variable is set."
    );
  }

  let dirPath;
  if (process.env.EXPO_STAGING) {
    dirPath = path.join(home, '.expo-staging');
  } else if (process.env.EXPO_LOCAL) {
    dirPath = path.join(home, '.expo-local');
  } else {
    dirPath = path.join(home, '.expo');
  }
  return dirPath;
}

const getStateJsonPath = (): string => path.join(dotExpoHomeDirectory(), 'state.json');

export { getStateJsonPath };
