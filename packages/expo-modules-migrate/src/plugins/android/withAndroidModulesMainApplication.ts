import { ConfigPlugin, withMainApplication } from '@expo/config-plugins';
import {
  addImports,
  appendContentsInsideDeclarationBlock,
  findNewInstanceCodeBlock,
} from '@expo/config-plugins/build/android/codeMod';
import { replaceContentsWithOffset } from '@expo/config-plugins/build/utils/commonCodeMod';

export const withAndroidModulesMainApplication: ConfigPlugin = config => {
  return withMainApplication(config, config => {
    config.modResults.contents = setModulesMainApplication(
      config.modResults.contents,
      config.modResults.language
    );
    return config;
  });
};

export function setModulesMainApplication(
  mainApplication: string,
  language: 'java' | 'kt'
): string {
  const isJava = language === 'java';

  mainApplication = addReactNativeHostWrapperIfNeeded(mainApplication, language, isJava);
  mainApplication = addApplicationLifecycleDispatchImportIfNeeded(
    mainApplication,
    language,
    isJava
  );
  mainApplication = addApplicationCreateIfNeeded(mainApplication, language, isJava);
  mainApplication = addConfigurationChangeIfNeeded(mainApplication, language, isJava);

  return mainApplication;
}

function addReactNativeHostWrapperIfNeeded(
  mainApplication: string,
  language: 'java' | 'kt',
  isJava: boolean
): string {
  if (mainApplication.match(/\s+ReactNativeHostWrapper\(/m)) {
    return mainApplication;
  }

  mainApplication = addImports(
    mainApplication,
    ['org.unimodules.adapters.react.ReactNativeHostWrapper'],
    isJava
  );

  const newInstanceCodeBlock = findNewInstanceCodeBlock(
    mainApplication,
    'ReactNativeHost',
    language
  );
  if (newInstanceCodeBlock == null) {
    throw new Error('Unable to find ReactNativeHost new instance code block.');
  }

  const replacement = isJava
    ? `new ReactNativeHostWrapper(this, ${newInstanceCodeBlock.code})`
    : `ReactNativeHostWrapper(this, ${newInstanceCodeBlock.code})`;
  mainApplication = replaceContentsWithOffset(
    mainApplication,
    replacement,
    newInstanceCodeBlock.start,
    newInstanceCodeBlock.end
  );
  return mainApplication;
}

function addApplicationLifecycleDispatchImportIfNeeded(
  mainApplication: string,
  language: 'java' | 'kt',
  isJava: boolean
) {
  if (
    mainApplication.match(
      /^import\s+org\.unimodules\.adapters\.react\.ApplicationLifecycleDispatcher;?$/
    )
  ) {
    return mainApplication;
  }

  return addImports(
    mainApplication,
    ['org.unimodules.adapters.react.ApplicationLifecycleDispatcher'],
    isJava
  );
}

function addApplicationCreateIfNeeded(
  mainApplication: string,
  language: 'java' | 'kt',
  isJava: boolean
): string {
  if (mainApplication.match(/\s+ApplicationLifecycleDispatcher\.onApplicationCreate\(/m)) {
    return mainApplication;
  }

  return appendContentsInsideDeclarationBlock(
    mainApplication,
    'onCreate',
    `  ApplicationLifecycleDispatcher.onApplicationCreate(this)${isJava ? ';' : ''}\n  `
  );
}

function addConfigurationChangeIfNeeded(
  mainApplication: string,
  language: 'java' | 'kt',
  isJava: boolean
): string {
  if (mainApplication.match(/\s+onConfigurationChanged\(/m) == null) {
    // If not override onConfigurationChanged() at all
    mainApplication = addImports(mainApplication, ['android.content.res.Configuration'], isJava);

    const addConfigurationChangeBlock = isJava
      ? [
          '\n  @Override',
          '  public void onConfigurationChanged(@NonNull Configuration newConfig) {',
          '    super.onConfigurationChanged(newConfig);',
          '    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);',
          '  }\n',
        ].join('\n')
      : [
          '\n  override fun onConfigurationChanged(newConfig: Configuration) {',
          '    super.onConfigurationChanged(newConfig)',
          '    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)',
          '  }\n',
        ].join('\n');
    mainApplication = appendContentsInsideDeclarationBlock(
      mainApplication,
      'class MainApplication',
      addConfigurationChangeBlock
    );
  } else if (
    mainApplication.match(/\s+ApplicationLifecycleDispatcher\.onConfigurationChanged\(/m) == null
  ) {
    // If override onConfigurationChanged() but no ApplicationLifecycleDispatcher yet
    mainApplication = appendContentsInsideDeclarationBlock(
      mainApplication,
      'onConfigurationChanged',
      `  ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)${
        isJava ? ';' : ''
      }\n  `
    );
  }

  return mainApplication;
}
