import prompt from '../../../../utils/prompts';
import { nonEmptyInput } from '../../../../utils/validators';

enum AndroidPackageSourceType {
  userDefined,
  prompt,
}

interface AndroidPackageSourceBase {
  sourceType: AndroidPackageSourceType;
}

interface AndroidPackageUserDefinedSource extends AndroidPackageSourceBase {
  sourceType: AndroidPackageSourceType.userDefined;
  androidPackage: string;
}

interface AndroidPackagePromptSource extends AndroidPackageSourceBase {
  sourceType: AndroidPackageSourceType.prompt;
}

export type AndroidPackageSource = AndroidPackageUserDefinedSource | AndroidPackagePromptSource;

async function getAndroidPackageAsync(source: AndroidPackageSource) {
  if (source.sourceType === AndroidPackageSourceType.userDefined) {
    return source.androidPackage;
  } else if (source.sourceType === AndroidPackageSourceType.prompt) {
    const { androidPackage } = await prompt({
      name: 'androidPackage',
      message: 'Android package name:',
      type: 'text',
      validate: nonEmptyInput,
    });
    return androidPackage;
  } else {
    throw new Error('This should never happen');
  }
}

export { AndroidPackageSourceType, getAndroidPackageAsync };
