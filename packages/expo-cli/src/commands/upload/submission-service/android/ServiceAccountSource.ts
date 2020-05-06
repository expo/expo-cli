import fs from 'fs-extra';

import prompt from '../../../../prompt';
import { existingFile } from '../../../../validators';
import log from '../../../../log';

enum ServiceAccountSourceType {
  path,
  prompt,
  // credentialsService,
  // ...
}

interface ServiceAccountSourceBase {
  sourceType: ServiceAccountSourceType;
}

interface ServiceAccountPathSource extends ServiceAccountSourceBase {
  sourceType: ServiceAccountSourceType.path;
  path: string;
}

interface ServiceAccountPromptSource extends ServiceAccountSourceBase {
  sourceType: ServiceAccountSourceType.prompt;
}

export type ServiceAccountSource = ServiceAccountPathSource | ServiceAccountPromptSource;

async function getServiceAccountAsync(source: ServiceAccountSource): Promise<string> {
  if (source.sourceType === ServiceAccountSourceType.path) {
    if (!(await existingFile(source.path))) {
      log.warn(`File ${source.path} doesn't exist.`);
      return await getServiceAccountAsync({ sourceType: ServiceAccountSourceType.prompt });
    }
    return await fs.readFile(source.path, 'utf-8');
  } else if (source.sourceType === ServiceAccountSourceType.prompt) {
    const { filePath } = await prompt({
      name: 'filePath',
      message: 'Path to the Service Account file:',
      type: 'input',
      validate: async (path: string): Promise<boolean | string> => {
        if (!(await existingFile(path, false))) {
          return `File ${path} doesn't exist.`;
        } else {
          return true;
        }
      },
    });
    return await getServiceAccountAsync({
      sourceType: ServiceAccountSourceType.path,
      path: filePath,
    });
  } else {
    throw new Error('This should never happen');
  }
}

export { ServiceAccountSourceType, getServiceAccountAsync };
