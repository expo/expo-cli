import { getTemplateGeneratedProjectBuildGradleContents } from '../../plugins/compiler-plugins';
import * as WarningAggregator from '../../utils/warnings';
import { applyProjectGradleMavenPackage } from '../Gradle';

jest.mock('fs');
jest.mock('../../utils/warnings');

describe(applyProjectGradleMavenPackage, () => {
  it('appends packages to gradle', () => {
    const contents = getTemplateGeneratedProjectBuildGradleContents();
    const modified = applyProjectGradleMavenPackage({
      contents,
      importFilePath: '../node_modules/expo-camera/android/maven',
      mavenPluginId: 'expo-camera',
    });

    // Given the fragile nature, carefully match that the block is placed correctly
    const expected = [
      'allprojects {',
      'repositories {',
      '// @begin allprojects-repositories',
      `maven{url "$rootDir/../node_modules/expo-camera/android/maven"} // @plugin expo-camera`,
      '// @end allprojects-repositories',
      '}',
      '}',
    ].join('\n');

    expect(modified).toMatch(expected);

    // Ensure the mavenPluginId is used to prevent duplicates (not needed for production, but nice to have).
    const modifiedTwice = applyProjectGradleMavenPackage({
      contents: modified,
      importFilePath: '../node_modules/expo-camera/android/maven',
      mavenPluginId: 'expo-camera',
    });

    expect(modifiedTwice).toMatch(expected);
  });
  it('warns when a malformed generated gradle is used', () => {
    const malformed = '// noop';
    const modified = applyProjectGradleMavenPackage({
      contents: malformed,
      importFilePath: '../node_modules/expo-camera/android/maven',
      mavenPluginId: 'expo-camera',
    });

    expect(WarningAggregator.addWarningAndroid).toHaveBeenLastCalledWith(
      'android-maven-package',
      'Failed to add maven package "../node_modules/expo-camera/android/maven" for ID "expo-camera" because the generated file `android/.expo-android/project-build.gradle` is malformed.'
    );

    // Doesn't modify
    expect(modified).toMatch(malformed);
  });
  // No need to test against removing the value since the file should be regenerated every time mods are recompiled.
});
