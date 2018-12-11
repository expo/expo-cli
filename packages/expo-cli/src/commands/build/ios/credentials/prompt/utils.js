import fs from 'fs-extra';

async function readFileIfExists(filePath, base64Encode = false) {
  if (!filePath) {
    return null;
  }
  if (await fs.pathExists(filePath)) {
    const fileContents = await fs.readFile(filePath);
    return fileContents.toString(base64Encode ? 'base64' : 'utf8');
  } else {
    throw new Error(`${filePath} doesn't exist`);
  }
}

export { readFileIfExists };
