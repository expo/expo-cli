import {
  AndroidConfig,
  ConfigPlugin,
  findMatchingBracketPosition,
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
      // insert just below super.onCreate
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

  // If override `createReactActivityDelegate()` already, return original delegate with wrapper.
  if (!mainActivity.match(/\s+ReactActivityDelegateWrapper\(/m)) {
    mainActivity = AndroidConfig.UserInterfaceStyle.addJavaImports(
      mainActivity,
      ['org.unimodules.adapters.react.ReactActivityDelegateWrapper'],
      isJava
    );

    const startOffset =
      (isJava
        ? mainActivity.indexOf(' new ReactActivityDelegate(')
        : mainActivity.search(/ (object\s*:\s*)?ReactActivityDelegate\(/)) + 1; // `+ 1` for the prefix space
    let endOffset = findMatchingBracketPosition(mainActivity, '(', startOffset);

    const nextBrace = mainActivity.indexOf('{', endOffset + 1);
    const isAnonymousClassObject =
      nextBrace >= endOffset && !!mainActivity.substring(endOffset + 1, nextBrace).match(/^\s*$/m);
    if (isAnonymousClassObject) {
      endOffset = findMatchingBracketPosition(mainActivity, '{', endOffset);
    }

    const wrappedContent = mainActivity.substring(startOffset, endOffset + 1);
    const replacement = isJava
      ? `new ReactActivityDelegateWrapper(this, ${wrappedContent})`
      : `ReactActivityDelegateWrapper(this, ${wrappedContent})`;
    mainActivity = replaceContentsWithOffset(mainActivity, replacement, startOffset, endOffset);

    return mainActivity;
  }

  return mainActivity;
}
