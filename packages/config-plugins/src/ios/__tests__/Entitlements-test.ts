import plist from '@expo/plist';
import * as fs from 'fs';
import { vol } from 'memfs';
import * as path from 'path';

import { fileExistsAsync } from '../../utils/modules';
import { getEntitlementsPath } from '../Entitlements';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

describe(getEntitlementsPath, () => {
  const projectRoot = '/app';
  const projectRootNone = '/no-config';
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/old.entitlements': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>special</key>
	<true/>
</dict>
</plist>`,
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.m': '',
      },
      projectRootNone
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('creates a new entitlements file when none exists', async () => {
    const entitlementsPath = getEntitlementsPath(projectRootNone);
    expect(entitlementsPath).toBe('/no-config/ios/testproject/testproject.entitlements');

    // New file has the contents of the old entitlements file
    const data = plist.parse(await fs.promises.readFile(entitlementsPath, 'utf8'));
    expect(data).toStrictEqual({
      // Push notifications enabled by default
      'aps-environment': 'development',
    });
  });

  it('creates a new entitlements file and copies the contents of the older one before deleting it', async () => {
    const entitlementsPath = getEntitlementsPath(projectRoot);
    expect(entitlementsPath).toBe('/app/ios/testproject/testproject.entitlements');

    // New file has the contents of the old entitlements file
    const data = plist.parse(await fs.promises.readFile(entitlementsPath, 'utf8'));
    expect(data).toStrictEqual({ special: true });

    // Old file is deleted
    expect(await fileExistsAsync('/app/ios/testproject/old.entitlements')).toBe(false);
  });
});
