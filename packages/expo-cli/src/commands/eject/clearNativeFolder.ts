import fs from 'fs-extra';
import path from 'path';

import * as CreateApp from '../utils/CreateApp';

export async function clearNativeFolder(projectRoot: string, folders: string[]) {
  const step = CreateApp.logNewSection(`Clearing ${folders.join(', ')}`);
  try {
    await Promise.all(folders.map(folderName => fs.remove(path.join(projectRoot, folderName))));
    step.succeed(`Cleared ${folders.join(', ')} code`);
  } catch (error) {
    step.fail(`Failed to delete ${folders.join(', ')} code: ${error.message}`);
    throw error;
  }
}
