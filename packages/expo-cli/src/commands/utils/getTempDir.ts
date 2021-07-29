import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { join } from 'path';

export function getTempStr() {
  return crypto.randomBytes(16).toString('hex').slice(0, 32);
}

export function getTempDir() {
  const directory = join(fs.realpathSync(os.tmpdir()), getTempStr());
  fs.mkdirSync(directory);
  return directory;
}
