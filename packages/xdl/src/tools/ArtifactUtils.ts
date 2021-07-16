import fs from 'fs-extra';
import path from 'path';

import logger from '../Logger';

export async function writeArtifactSafelyAsync(
  projectRoot: string,
  keyName: string | null,
  artifactPath: string,
  artifact: string | Uint8Array
) {
  const pathToWrite = path.resolve(projectRoot, artifactPath);
  if (!fs.existsSync(path.dirname(pathToWrite))) {
    const errorMsg = keyName
      ? `app.json specifies: ${pathToWrite}, but that directory does not exist.`
      : `app.json specifies ${keyName}: ${pathToWrite}, but that directory does not exist.`;
    logger.global.warn(errorMsg);
  } else {
    await fs.writeFile(pathToWrite, artifact);
  }
}
