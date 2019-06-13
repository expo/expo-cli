import spawnAsync from '@expo/spawn-async';

export async function isAvailableAsync() {
  try {
    await spawnAsync('sharp', ['--version']);
    return true;
  } catch (e) {
    return false;
  }
}

export async function compressAsync({ input, output, quality }) {
  try {
    await spawnAsync('sharp', ['-i', input, '-o', output, '-q', quality]);
    return true;
  } catch (e) {
    return false;
  }
}
