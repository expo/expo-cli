import {
  AndroidConfig,
  ConfigPlugin,
  findNewInstanceCodeBlock,
  replaceContentsWithOffset,
  withMainActivity,
} from '@expo/config-plugins';
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';

export const withAndroidModulesMainActivity: ConfigPlugin = config => {
  return withMainActivity(config, config => {
    config.modResults.contents = setModulesMainActivity(
      config.modResults.contents,
      config.modResults.language
    );
    return config;
  });
};

export function setModulesMainActivity(mainActivity: string, language: 'java' | 'kt'): string {
  const isJava = language === 'java';

  // If not override `createReactActivityDelegate()`, tries to override with wrapper
  if (!mainActivity.match(/\s+createReactActivityDelegate\(\)/m)) {
    mainActivity = AndroidConfig.UserInterfaceStyle.addJavaImports(
      mainActivity,
      [
        'com.facebook.react.ReactActivityDelegate',
        'org.unimodules.adapters.react.ReactActivityDelegateWrapper',
      ],
      isJava
    );

    const addReactActivityDelegateBlock = isJava
      ? [
          '  @Override',
          '  protected ReactActivityDelegate createReactActivityDelegate() {',
          '    return new ReactActivityDelegateWrapper(this,',
          '      new ReactActivityDelegate(this, getMainComponentName())',
          '    );',
          '  }',
        ]
      : [
          '  override fun createReactActivityDelegate(): ReactActivityDelegate {',
          '    return ReactActivityDelegateWrapper(this,',
          '      ReactActivityDelegate(this, getMainComponentName())',
          '    );',
          '  }',
        ];

    mainActivity = mergeContents({
      src: mainActivity,
      // insert just below ReactActivity declaration
      anchor: isJava
        ? /^\s*public\s+class\s+.*\s+extends\s+ReactActivity\s+{.*$/m
        : /^\s*class\s+.*\s+:\s+ReactActivity\(\)\s+{.*$/m,
      offset: 1,
      comment: '//',
      tag: 'expo-modules-mainActivity-createReactActivityDelegate',
      newSrc: addReactActivityDelegateBlock.join('\n'),
    }).contents;

    return mainActivity;
  }

  // If override `createReactActivityDelegate()` already, wrap it with `ReactActivityDelegateWrapper`
  if (!mainActivity.match(/\s+ReactActivityDelegateWrapper\(/m)) {
    mainActivity = AndroidConfig.UserInterfaceStyle.addJavaImports(
      mainActivity,
      ['org.unimodules.adapters.react.ReactActivityDelegateWrapper'],
      isJava
    );

    const newInstanceCodeBlock = findNewInstanceCodeBlock(
      mainActivity,
      'ReactActivityDelegate',
      language
    );
    if (newInstanceCodeBlock == null) {
      throw new Error('Unable to find ReactActivityDelegate new instance code block.');
    }

    const replacement = isJava
      ? `new ReactActivityDelegateWrapper(this, ${newInstanceCodeBlock.code})`
      : `ReactActivityDelegateWrapper(this, ${newInstanceCodeBlock.code})`;
    mainActivity = replaceContentsWithOffset(
      mainActivity,
      replacement,
      newInstanceCodeBlock.start,
      newInstanceCodeBlock.end
    );

    return mainActivity;
  }

  return mainActivity;
}
