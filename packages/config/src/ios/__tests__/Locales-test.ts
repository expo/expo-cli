import { fs, vol } from 'memfs';
import * as path from 'path';

import { getLocales, setLocalesAsync } from '../Locales';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

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

    await setLocalesAsync(
      {
        slug: 'testproject',
        version: '1',
        name: 'testproject',
        platforms: ['ios', 'android'],
        locales: {
          fr: 'lang/fr.json',
        },
      },
      projectRoot
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', async () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    const locales = Object.keys(after).filter(value => value.endsWith('InfoPlist.strings'));

    expect(locales.length).toBe(1);
    expect(after[locales[0]]).toMatchSnapshot();
  });
});
