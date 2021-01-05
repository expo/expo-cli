import prompt from '../../../../prompts';
import { nonEmptyInput } from '../../../../validators';

enum AndroidApplicationIdSourceType {
  userDefined,
  prompt,
}

interface AndroidApplicationIdSourceBase {
  sourceType: AndroidApplicationIdSourceType;
}

interface AndroidApplicationIdUserDefinedSource extends AndroidApplicationIdSourceBase {
  sourceType: AndroidApplicationIdSourceType.userDefined;
  androidApplicationId: string;
}

interface AndroidApplicationIdPromptSource extends AndroidApplicationIdSourceBase {
  sourceType: AndroidApplicationIdSourceType.prompt;
}

export type AndroidApplicationIdSource =
  | AndroidApplicationIdUserDefinedSource
  | AndroidApplicationIdPromptSource;

async function getAndroidApplicationIdAsync(source: AndroidApplicationIdSource) {
  if (source.sourceType === AndroidApplicationIdSourceType.userDefined) {
    return source.androidApplicationId;
  } else if (source.sourceType === AndroidApplicationIdSourceType.prompt) {
    const { androidApplicationId } = await prompt({
      name: 'androidApplicationId',
      message: 'Android application ID:',
      type: 'text',
      validate: nonEmptyInput,
    });
    return androidApplicationId;
  } else {
    throw new Error('This should never happen');
  }
}

export { AndroidApplicationIdSourceType, getAndroidApplicationIdAsync };
