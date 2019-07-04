import fs from 'fs-extra';

function nonEmptyInput(val: string) {
  return val !== '';
}

const existingFile = async (filePath: string, verbose = true) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (e) {
    if (verbose) {
      console.log('\nFile does not exist.');
    }
    return false;
  }
};

export { nonEmptyInput, existingFile };
