import { vol } from 'memfs';

import { SplashScreenImageResizeMode } from '../../constants';
import configureMainActivity from '../MainActivity';
import reactNativeProject from './fixtures/react-native-project-structure';

jest.mock('fs');

describe('MainActivity', () => {
  describe('configureMainActivity', () => {
    function generateMainActivityFileContent({
      addOnCreateAt,
      kotlin,
      addSplashScreenShowWith,
      statusBarTranslucent = false,
    }: {
      kotlin?: boolean;
      addOnCreateAt?: 'BOTTOM' | 'TOP';
      addSplashScreenShowWith?: 'CONTAIN' | 'COVER' | 'NATIVE';
      statusBarTranslucent?: boolean;
    } = {}) {
      const LE = kotlin ? '' : ';';
      const onCreate = `${
        kotlin
          ? `
  override fun onCreate(savedInstanceState: Bundle?)`
          : `
  @Override
  protected void onCreate(Bundle savedInstanceState)`
      } {
    super.onCreate(savedInstanceState)${LE}${
        !addSplashScreenShowWith
          ? ''
          : `
    // SplashScreen.show(...) has to be called after super.onCreate(...)
    // Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually
    SplashScreen.show(this, SplashScreenImageResizeMode.${addSplashScreenShowWith}, ReactRootView${
              kotlin ? '::class.java' : '.class'
            }, ${statusBarTranslucent})${LE}`
      }
  }
`;

      return `package com.reactnativeproject${LE}
${
  !addOnCreateAt
    ? ''
    : `
import android.os.Bundle${LE}
`
}
import com.facebook.react.ReactActivity${LE}

import com.facebook.react.ReactRootView${LE}
${
  !addSplashScreenShowWith
    ? ''
    : `
import expo.modules.splashscreen.singletons.SplashScreen${LE}
import expo.modules.splashscreen.SplashScreenImageResizeMode${LE}
`
}
${
  kotlin
    ? 'class MainActivity : ReactActivity()'
    : 'public class MainActivity extends ReactActivity'
} {${addOnCreateAt !== 'TOP' ? '' : onCreate}
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */${
     kotlin
       ? `
  override fun getMainComponentName(): String`
       : `
  @Override
  protected String getMainComponentName()`
   } {
    return "react-native-project"${LE}
  }${addOnCreateAt !== 'BOTTOM' ? '' : onCreate}
}
`;
    }

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    describe('MainActivity.java', () => {
      const projectRootPath = '/app';
      const filePath = '/app/android/app/src/main/java/com/reactnativeproject/MainActivity.java';

      it('inserts onCreate() with SplashScreen registration', async () => {
        await configureMainActivity(projectRootPath, {
          imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        const expected = generateMainActivityFileContent({
          addSplashScreenShowWith: 'CONTAIN',
          addOnCreateAt: 'TOP',
        });
        expect(actual).toEqual(expected);
      });

      it('adds SplashScreen registration to onCreate()', async () => {
        vol.writeFileSync(filePath, generateMainActivityFileContent({ addOnCreateAt: 'BOTTOM' }));
        await configureMainActivity(projectRootPath, {
          imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        const expected = generateMainActivityFileContent({
          addSplashScreenShowWith: 'CONTAIN',
          addOnCreateAt: 'BOTTOM',
        });
        expect(actual).toEqual(expected);
      });

      describe('reconfigures SplashScreen mode', () => {
        it('NATIVE', async () => {
          vol.writeFileSync(
            filePath,
            generateMainActivityFileContent({
              addOnCreateAt: 'TOP',
              addSplashScreenShowWith: 'CONTAIN',
            })
          );
          await configureMainActivity(projectRootPath, {
            imageResizeMode: SplashScreenImageResizeMode.NATIVE,
          });
          const actual = vol.readFileSync(filePath, 'utf-8');
          const expected = generateMainActivityFileContent({
            addSplashScreenShowWith: 'NATIVE',
            addOnCreateAt: 'TOP',
          });
          expect(actual).toEqual(expected);
        });
      });

      describe('handles statusBarTranslucent flag', () => {
        it('enable statusBar translucency', async () => {
          await configureMainActivity(projectRootPath, {
            imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
            statusBar: {
              translucent: true,
            },
          });
          const actual = vol.readFileSync(filePath, 'utf-8');
          const expected = generateMainActivityFileContent({
            addSplashScreenShowWith: 'CONTAIN',
            addOnCreateAt: 'TOP',
            statusBarTranslucent: true,
          });
          expect(actual).toEqual(expected);
        });
      });
    });

    describe('MainActivity.kt', () => {
      const projectRootPath = '/app';
      const filePathJava =
        '/app/android/app/src/main/java/com/reactnativeproject/MainActivity.java';
      const filePath = '/app/android/app/src/main/java/com/reactnativeproject/MainActivity.kt';

      beforeEach(() => {
        vol.unlinkSync(filePathJava);
        vol.writeFileSync(filePath, generateMainActivityFileContent({ kotlin: true }));
      });

      it('inserts onCreate() with SplashScreen registration', async () => {
        await configureMainActivity(projectRootPath, {
          imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        const expected = generateMainActivityFileContent({
          kotlin: true,
          addOnCreateAt: 'TOP',
          addSplashScreenShowWith: 'CONTAIN',
        });
        expect(actual).toEqual(expected);
      });

      it('adds SplashScreen registration to onCreate()', async () => {
        vol.writeFileSync(
          filePath,
          generateMainActivityFileContent({
            kotlin: true,
            addOnCreateAt: 'TOP',
          })
        );
        await configureMainActivity(projectRootPath, {
          imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        const expected = generateMainActivityFileContent({
          kotlin: true,
          addOnCreateAt: 'TOP',
          addSplashScreenShowWith: 'CONTAIN',
        });
        expect(actual).toEqual(expected);
      });

      describe('reconfigures SplashScreen mode', () => {
        it('NATIVE', async () => {
          vol.writeFileSync(
            filePath,
            generateMainActivityFileContent({
              kotlin: true,
              addOnCreateAt: 'TOP',
              addSplashScreenShowWith: 'CONTAIN',
            })
          );
          await configureMainActivity(projectRootPath, {
            imageResizeMode: SplashScreenImageResizeMode.NATIVE,
          });
          const actual = vol.readFileSync(filePath, 'utf-8');
          const expected = generateMainActivityFileContent({
            kotlin: true,
            addSplashScreenShowWith: 'NATIVE',
            addOnCreateAt: 'TOP',
          });
          expect(actual).toEqual(expected);
        });
      });
    });
  });
});
