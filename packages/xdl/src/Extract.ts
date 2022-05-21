import spawnAsync from '@expo/spawn-async';
import tar from 'tar';

export async function extractAsync(archive: string, dir: string): Promise<void> {
  try {
    if (process.platform !== 'win32') {
      await spawnAsync('tar', ['-xf', archive, '-C', dir], {
        stdio: 'inherit',
        cwd: __dirname,
      });
      return;
    }
  } catch (e: any) {
    console.error(e.message);
  }
  // tar node module has previously had problems with big files, and seems to
  // be slower, so only use it as a backup.
  await tar.extract({ file: archive, cwd: dir });
}
