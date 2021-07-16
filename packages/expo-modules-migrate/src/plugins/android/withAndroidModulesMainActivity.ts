import { ConfigPlugin, withMainActivity } from '@expo/config-plugins';
import {
  addImports,
  appendContentsInsideDeclarationBlock,
  findNewInstanceCodeBlock,
  replaceContentsWithOffset,
} from '@expo/config-plugins/build/utils/androidCode';

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

  if (mainActivity.match(/\s+createReactActivityDelegate\(\)/m) == null) {
    // If not override `createReactActivityDelegate()`, tries to override with wrapper
    mainActivity = addImports(
      mainActivity,
      [
        'com.facebook.react.ReactActivityDelegate',
        'org.unimodules.adapters.react.ReactActivityDelegateWrapper',
      ],
      isJava
    );

    const addReactActivityDelegateBlock = isJava
      ? [
          '\n  @Override',
          '  protected ReactActivityDelegate createReactActivityDelegate() {',
          '    return new ReactActivityDelegateWrapper(this,',
          '      new ReactActivityDelegate(this, getMainComponentName())',
          '    );',
          '  }\n',
        ]
      : [
          '\n  override fun createReactActivityDelegate(): ReactActivityDelegate {',
          '    return ReactActivityDelegateWrapper(this,',
          '      ReactActivityDelegate(this, getMainComponentName())',
          '    );',
          '  }\n',
        ];

    mainActivity = appendContentsInsideDeclarationBlock(
      mainActivity,
      'class MainActivity',
      addReactActivityDelegateBlock.join('\n')
    );
  } else if (mainActivity.match(/\s+ReactActivityDelegateWrapper\(/m) == null) {
    // If override `createReactActivityDelegate()` already, wrap it with `ReactActivityDelegateWrapper`
    mainActivity = addImports(
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
