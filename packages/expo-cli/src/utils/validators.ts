import fs from 'fs-extra';

import Log from '../log';

function nonEmptyInput(val: string) {
  return val !== '';
}

const existingFile = async (filePath: string, verbose = true) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (e) {
    if (verbose) {
      Log.log('\nFile does not exist.');
    }
    return false;
  }
};

// note(cedric): export prompts-compatible validators,
// refactor when prompt is replaced with prompts
const promptsNonEmptyInput = nonEmptyInput;
const promptsExistingFile = async (filePath: string) => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      return true;
    }
    return 'Input is not a file.';
  } catch {
    return 'File does not exist.';
  }
};

export { nonEmptyInput, existingFile, promptsNonEmptyInput, promptsExistingFile };
