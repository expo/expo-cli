/**
 * @flow
 */

jasmine.DEFAULT_TIMEOUT_INTERVAL = 240000;
import path from 'path';
import uuid from 'uuid';
import rimraf from 'rimraf';
import { clearXDLCacheAsync, downloadTemplateApp, extractTemplateApp } from '../Exp';

describe('Template Apps', () => {
  xit('should download the starter app template and extract it', async () => {
    // This was working locally but failing on the mac ci machine
    /*
    process.env.UNSAFE_EXPO_HOME_DIRECTORY = path.join(
      '/',
      'tmp',
      `.expo-${uuid.v1()}`
    );

    await clearXDLCacheAsync();
    let dir = path.join('/', 'tmp', `.expo-${uuid.v1()}`);
    let templateDownload = await downloadTemplateApp('tabs', dir, {
      name: `test-template-${new Date().valueOf()}`,
      progressFunction: () => {},
      retryFunction: () => {},
    });
    expect(templateDownload).not.toBeNull();
    // Extract the template we just downloaded
    let projectRoot = await extractTemplateApp(
      templateDownload.starterAppPath,
      templateDownload.name,
      templateDownload.root
    );

    rimraf.sync(process.env.UNSAFE_EXPO_HOME_DIRECTORY);
    rimraf.sync(dir);
    */
  });
});
