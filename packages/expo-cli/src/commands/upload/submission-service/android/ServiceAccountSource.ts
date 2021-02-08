import log from '../../../../log';
import prompt from '../../../../prompts';
import { existingFile } from '../../../../validators';
import { learnMore } from '../../../utils/TerminalLink';

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
  switch (source.sourceType) {
    case ServiceAccountSourceType.path:
      return await handlePathSourceAsync(source);
    case ServiceAccountSourceType.prompt:
      return await handlePromptSourceAsync(source);
  }
}

async function handlePathSourceAsync(source: ServiceAccountPathSource): Promise<string> {
  if (!(await existingFile(source.path))) {
    log.warn(`File ${source.path} doesn't exist.`);
    return await getServiceAccountAsync({ sourceType: ServiceAccountSourceType.prompt });
  }
  return source.path;
}

async function handlePromptSourceAsync(_source: ServiceAccountPromptSource): Promise<string> {
  const path = await askForServiceAccountPathAsync();
  return await getServiceAccountAsync({
    sourceType: ServiceAccountSourceType.path,
    path,
  });
}

async function askForServiceAccountPathAsync(): Promise<string> {
  log.log(
    `${log.chalk.bold(
      'A Google Service Account JSON key is required to upload your app to Google Play Store'
    )}.\n` +
      `If you're not sure what this is or how to create one, ${log.chalk.dim(
        learnMore('https://expo.fyi/creating-google-service-account')
      )}.`
  );
  const { filePath } = await prompt({
    name: 'filePath',
    message: 'Path to Google Service Account file:',
    initial: 'api-0000000000000000000-111111-aaaaaabbbbbb.json',
    type: 'text',
    validate: async (path: string): Promise<boolean | string> => {
      if (!(await existingFile(path, false))) {
        return `File ${path} doesn't exist.`;
      } else {
        return true;
      }
    },
  });
  return filePath;
}

export { ServiceAccountSourceType, getServiceAccountAsync };
