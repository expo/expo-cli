import { ConfigPlugin, withPlugins, withSettingsGradle } from '@expo/config-plugins';

import { withAndroidModulesMainActivity } from './withAndroidModulesMainActivity';
import { withAndroidModulesMainApplication } from './withAndroidModulesMainApplication';

export const withAndroidModules: ConfigPlugin = config => {
  return withPlugins(config, [
    withAndroidModulesMainApplication,
    withAndroidModulesMainActivity,
    withAndroidModulesSettingGradle,
  ]);
};

const withAndroidModulesSettingGradle: ConfigPlugin = config => {
  return withSettingsGradle(config, config => {
    if (config.modResults.contents.match('WuseExpoModules()')) {
      return config;
    }

    const isGroovy = config.modResults.language === 'groovy';
    const addCodeBlock = isGroovy
      ? [
          'apply from: "../packages/@unimodules/react-native-adapter/scripts/autolinking.gradle"',
          'useExpoModules()',
        ]
      : [
          'apply(from = "../packages/@unimodules/react-native-adapter/scripts/autolinking.gradle")',
          'val useExpoModules = extra["useExpoModules"] as groovy.lang.Closure<Any>',
          'useExpoModules()',
        ];

    config.modResults.contents = config.modResults.contents + `\n${addCodeBlock.join('\n')}`;
    return config;
  });
};
