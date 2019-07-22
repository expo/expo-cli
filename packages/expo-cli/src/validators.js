import fs from 'fs-extra';

const nonEmptyInput = val => val !== '';

const existingFile = async (filePath, verbose = true) => {
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
