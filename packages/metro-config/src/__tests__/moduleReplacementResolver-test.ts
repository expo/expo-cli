import { vol } from 'memfs';

import {
  collectModuleReplacementsInDirectory,
  testResolutionForReplacements,
} from '../moduleReplacementResolver';

jest.mock('fs');

describe(testResolutionForReplacements, () => {
  it(`tests positive`, () => {
    expect(
      testResolutionForReplacements(
        {
          filePath: '/something/foo.js',
          type: 'sourceFile',
        },
        [
          {
            match: /foo\.js$/,
            replace: 'replaced-value',
          },
        ]
      )
    ).toStrictEqual({
      filePath: 'replaced-value',
      type: 'sourceFile',
    });
  });
});

describe(collectModuleReplacementsInDirectory, () => {
  afterAll(() => vol.reset());

  it(`collects paths recursively`, () => {
    vol.fromJSON({
      '/patches/react-native/Libraries/Utilities/Appearance.js': '',
      '/patches/@expo/config/foobar.js': '',
      '/patches/webpack/package.json': '',
    });

    expect(collectModuleReplacementsInDirectory('/patches')).toStrictEqual([
      { match: /@expo\/config\/foobar\.js/, replace: '/patches/@expo/config/foobar.js' },
      {
        match: /react\x2dnative\/Libraries\/Utilities\/Appearance\.js/,
        replace: '/patches/react-native/Libraries/Utilities/Appearance.js',
      },
      { match: /webpack\/package\.json/, replace: '/patches/webpack/package.json' },
    ]);
  });
});
