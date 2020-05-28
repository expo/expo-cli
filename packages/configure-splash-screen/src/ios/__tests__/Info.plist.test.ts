import { vol } from 'memfs';

import configureInfoPlist from '../Info.plist';
import reactNativeProject from './fixtures/react-native-project-structure';
import { StatusBarStyle } from '../../constants';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Info.plist', () => {
  describe('configureInfoPlist', () => {
    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    const iosProjectPath = `/app/ios/ReactNativeProject`;
    const filePath = `${iosProjectPath}/Info.plist`;

    it('updates the file correctly', async () => {
      await configureInfoPlist(iosProjectPath);
      const actual = vol.readFileSync(filePath, 'utf-8');
      expect(actual).toMatch(
        /<key>UILaunchStoryboardName<\/key>(\n|.)*<string>SplashScreen<\/string>/
      );
    });

    describe('StatusBar configuration', () => {
      it('inserts UIStatusBarHidden', async () => {
        await configureInfoPlist(iosProjectPath, {
          statusBarHidden: true,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        expect(actual).toMatch(/<key>UIStatusBarHidden<\/key>(\n|.)*<true\/>/);
      });

      it('updates UIStatusBarHidden', async () => {
        await configureInfoPlist(iosProjectPath, {
          statusBarHidden: true,
        });
        await configureInfoPlist(iosProjectPath, {
          statusBarHidden: false,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        expect(actual).toMatch(/<key>UIStatusBarHidden<\/key>(\n|.)*<false\/>/);
      });

      it('inserts UIStatusBarStyle', async () => {
        await configureInfoPlist(iosProjectPath, {
          statusBarStyle: StatusBarStyle.LIGHT_CONTENT,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        expect(actual).toMatch(
          /<key>UIStatusBarStyle<\/key>(\n|.)*<string>UIStatusBarStyleLightContent<\/string>/
        );
      });

      it('updates UIStatusBarStyle', async () => {
        await configureInfoPlist(iosProjectPath, {
          statusBarStyle: StatusBarStyle.LIGHT_CONTENT,
        });
        await configureInfoPlist(iosProjectPath, {
          statusBarStyle: StatusBarStyle.DARK_CONTENT,
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        expect(actual).toMatch(
          /<key>UIStatusBarStyle<\/key>(\n|.)*<string>UIStatusBarStyleDarkContent<\/string>/
        );
      });
    });
  });
});
