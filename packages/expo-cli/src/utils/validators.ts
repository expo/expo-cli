import fs from 'fs';

function nonEmptyInput(val: string) {
  return val !== '';
}

// note(cedric): export prompts-compatible validators,
// refactor when prompt is replaced with prompts
const promptsNonEmptyInput = nonEmptyInput;
const promptsExistingFile = async (filePath: string) => {
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.isFile()) {
      return true;
    }
    return 'Input is not a file.';
  } catch {
    return 'File does not exist.';
  }
};

export { nonEmptyInput, promptsNonEmptyInput, promptsExistingFile };
