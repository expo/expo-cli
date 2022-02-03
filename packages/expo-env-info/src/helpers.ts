import fs from 'fs';
import path from 'path';

async function* walk(dir: string): AsyncGenerator<string, void, void> {
  for await (const d of await fs.promises.readdir(dir, { withFileTypes: true })) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield entry;
      yield* walk(entry);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}

export async function findFile(dir: string, ext: string) {
  return fs.promises
    .access(dir, fs.constants.F_OK)
    .then(async () => {
      for await (const file of await walk(dir)) {
        if (path.extname(file) === ext) return true;
      }
      return false;
    })
    .catch(() => {
      return false;
    });
}
