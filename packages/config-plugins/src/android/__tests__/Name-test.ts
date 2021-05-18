import fs from 'fs';
import { vol } from 'memfs';

import { applyNameSettingsGradle, getName, sanitizeNameForGradle, setName } from '../Name';
import { readResourcesXMLAsync } from '../Resources';

jest.mock('fs');

const mockSettingsGradle = `rootProject.name = 'My-Co0l 😃 Pet_Project!'

apply from: '../node_modules/react-native-unimodules/gradle.groovy'
includeUnimodulesProjects()

apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle");
applyNativeModulesSettingsGradle(settings)

include ':app'
`;

export const sampleStringsXML = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<resources>
  <string name="app_name">expo &amp;bo&lt;y&gt;'</string>
</resources>`;

const badName = `😃/\\:<>"?*|$F0g.`;
const badNameCleaned = `😃$F0g.`;

describe(sanitizeNameForGradle, () => {
  it('removes invalid characters', () => {
    expect(sanitizeNameForGradle(badName)).toBe(badNameCleaned);
  });
});
describe(applyNameSettingsGradle, () => {
  it('replaces name in settings', () => {
    const modified = applyNameSettingsGradle({ name: badName }, mockSettingsGradle);
    expect(modified.includes(`rootProject.name = '${badNameCleaned}'\n`)).toBe(true);
  });
  it('replaces name in settings with odd linting', () => {
    // No spaces and double quotes are supported too right now.
    const modified = applyNameSettingsGradle(
      { name: badName },
      `rootProject.name="My-Co0l 😃 Pet_Project!"`
    );
    // Replaces with expected linting
    expect(modified).toBe(`rootProject.name = '${badNameCleaned}'`);
  });
});

describe('name', () => {
  beforeAll(async () => {
    const directoryJSON = {
      './android/app/src/main/res/values/strings.xml': sampleStringsXML,
    };
    vol.fromJSON(directoryJSON, '/app');
  });

  afterAll(async () => {
    vol.reset();
  });

  it(`returns null if no name is provided`, () => {
    expect(getName({} as any)).toBe(null);
  });

  it(`returns the name if provided`, () => {
    expect(getName({ name: 'Some app' })).toBe('Some app');
  });

  it(`sets the app_name if name is given`, async () => {
    // Can write the escaped name and then read it back in unescaped format
    expect(await setName({ name: `'E&x<p>o"` }, '/app')).toBe(true);

    const stringsPath = '/app/android/app/src/main/res/values/strings.xml';
    const stringsJSON = await readResourcesXMLAsync({ path: stringsPath });
    const contents = await fs.promises.readFile(stringsPath, { encoding: 'utf8', flag: 'r' });

    // Test that it's written in escaped form
    expect(contents.includes(`'E&amp;x&lt;p&gt;o"`)).toBe(true);

    // And parsed in unescaped form
    expect(stringsJSON.resources.string.filter(e => e.$.name === 'app_name')[0]._).toBe(
      `'E&x<p>o"`
    );
  });
});
