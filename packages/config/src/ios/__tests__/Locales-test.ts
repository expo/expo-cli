import { fs, vol } from 'memfs';
import * as path from 'path';

import { addWarningIOS } from '../../WarningAggregator';
import { getLocales, setLocalesAsync } from '../Locales';
import { getPbxproj } from '../utils/Xcodeproj';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

jest.mock('../../WarningAggregator', () => ({
  addWarningIOS: jest.fn(),
}));

afterAll(() => {
  jest.unmock('fs');
  jest.unmock('../../WarningAggregator');
});

function getDirFromFS(fsJSON: Record<string, string | null>, rootDir: string) {
  return Object.entries(fsJSON)
    .filter(([path, value]) => value !== null && path.startsWith(rootDir))
    .reduce<Record<string, string>>(
      (acc, [path, fileContent]) => ({
        ...acc,
        [path.substring(rootDir.length).startsWith('/')
          ? path.substring(rootDir.length + 1)
          : path.substring(rootDir.length)]: fileContent,
      }),
      {}
    );
}

describe('iOS Locales', () => {
  it(`returns null if no values are provided`, () => {
    expect(getLocales({})).toBeNull();
  });

  it(`returns the locales object`, () => {
    expect(
      getLocales({
        locales: [{}],
      })
    ).toStrictEqual([{}]);
  });
});

describe('e2e: iOS locales', () => {
  const projectRoot = '/app';
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': actualFs.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.m': '',
        'lang/fr.json': JSON.stringify({
          CFBundleDisplayName: 'french-name',
        }),
      },
      projectRoot
    );

    let project = getPbxproj(projectRoot);

    project = await setLocalesAsync(
      {
        slug: 'testproject',
        version: '1',
        name: 'testproject',
        platforms: ['ios', 'android'],
        locales: {
          fr: 'lang/fr.json',
          // doesn't exist
          xx: 'lang/xx.json',
          // partially support inlining the JSON so our Expo Config type doesn't conflict with the resolved manifest type.
          es: { CFBundleDisplayName: 'spanish-name' },
        },
      },
      { project, projectRoot }
    );
    // Sync the Xcode project with the changes.
    fs.writeFileSync(project.filepath, project.writeSync());
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', async () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    const locales = Object.keys(after).filter(value => value.endsWith('InfoPlist.strings'));

    expect(locales.length).toBe(2);
    expect(after[locales[0]]).toMatchSnapshot();
    // Test that the inlined locale is resolved.
    expect(after[locales[1]]).toMatch(/spanish-name/);
    // Test a warning is thrown for an invalid locale JSON file.
    expect(addWarningIOS).toHaveBeenCalledWith(
      'locales-xx',
      'Failed to parse JSON of locale file for language: xx',
      'https://docs.expo.io/distribution/app-stores/#localizing-your-ios-app'
    );
  });
});
