import fs from 'fs-extra';
import { vol } from 'memfs';

import { getLocales, setLocalesAsync } from '../Locales';
import { getDirFromFS } from './utils/getDirFromFS';

jest.mock('fs');

jest.mock('../../WarningAggregator');
const { addWarningAndroid } = require('../../WarningAggregator');

export const sampleStringsXML = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<resources>
  <string name="app_name">expo &amp;bo&lt;y&gt;'</string>
</resources>`;

describe('android Locales', () => {
  it(`returns null if no values are provided`, () => {
    expect(getLocales({})).toBeNull();
  });

  it(`returns the android locales object`, () => {
    expect(
      getLocales({
        android:  {
          locales: [{}],
        }
      })
    ).toStrictEqual([{}]);
  });
});

describe('e2e: android locales', () => {
  const projectRoot = '/app';
  beforeAll(async () => {
    const directoryJSON = {
      'android/app/src/main/res/values/strings.xml': sampleStringsXML,
      'lang/fr.json': JSON.stringify({
        app_name: 'french-name',
      }),
    };
    vol.fromJSON(directoryJSON, projectRoot);

    await setLocalesAsync(
      {
        slug: 'testproject',
        version: '1',
        name: 'testproject',
        platforms: ['ios', 'android'],
        android: {
          locales: {
            fr: 'lang/fr.json',
            // doesn't exist
            xx: 'lang/xx.json',
            // partially support inlining the JSON so our Expo Config type doesn't conflict with the resolved manifest type.
            es: { app_name: 'spanish-name' },
          },
        },
      },
      projectRoot,
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the language files expected', async () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    const locales = Object.keys(after).filter(value => {
      return value.startsWith('android/app/src/main/res/values-');
    });

    expect(locales.length).toBe(2);
    expect(after[locales[0]]).toMatchSnapshot();
    // Test that the inlined locale is resolved.
    expect(after[locales[1]]).toMatch(/spanish-name/);
    // Test a warning is thrown for an invalid locale JSON file.
    expect(addWarningAndroid).toHaveBeenCalledWith(
      'locales-xx',
      'Failed to parse JSON of locale file for language: xx',
      'https://docs.expo.io/distribution/app-stores/#localizing-your-android-app'
    );
  });
});
