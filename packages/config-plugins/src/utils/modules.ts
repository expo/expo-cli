import fs from 'fs';

/**
 * A non-failing version of async FS stat.
 *
 * @param file
 */
async function statAsync(file: string): Promise<fs.Stats | null> {
  try {
    return await fs.promises.stat(file);
  } catch {
    return null;
  }
}

export async function fileExistsAsync(file: string): Promise<boolean> {
  return (await statAsync(file))?.isFile() ?? false;
}

export async function directoryExistsAsync(file: string): Promise<boolean> {
  return (await statAsync(file))?.isDirectory() ?? false;
}

export function pathExistsSync(file: string): boolean {
  try {
    return !!fs.statSync(file);
  } catch (e) {
    return false;
  }
}

export async function pathExists(file: string): Promise<boolean> {
  return fs.promises
    .access(file)
    .then(() => true)
    .catch(() => false);
}

export function fileExists(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch (e) {
    return false;
  }
}

export function moveAsync(oldPath: string, newPath: string) {
  return new Promise<void>((resolve, reject) => {
    fs.rename(oldPath, newPath, function (err) {
      if (err) {
        if (err.code === 'EXDEV') {
          copy();
        } else {
          reject(err);
        }
        return;
      }
      resolve();
    });

    function copy() {
      const readStream = fs.createReadStream(oldPath);
      const writeStream = fs.createWriteStream(newPath);
      readStream.on('error', reject);
      writeStream.on('error', reject);
      readStream.on('close', () => fs.unlink(oldPath, reject));
      readStream.pipe(writeStream);
    }
  });
}
