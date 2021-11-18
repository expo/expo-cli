import * as fs from 'fs';
import { vol } from 'memfs';
import * as path from 'path';

import { UnexpectedError } from '../../utils/errors';
import * as WarningAggregator from '../../utils/warnings';
import {
  findSchemeNames,
  getAllInfoPlistPaths,
  getAppDelegate,
  getXcodeProjectPath,
} from '../Paths';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');
jest.mock('../../utils/warnings');

describe(findSchemeNames, () => {
  afterEach(() => {
    vol.reset();
  });

  it(`returns project path`, () => {
    vol.fromJSON(
      {
        'ios/my-app.xcodeproj/xcshareddata/xcschemes/my-app.xcscheme': '',
        'ios/my_app.xcodeproj/xcshareddata/xcschemes/my_app.xcscheme': '',
        'ios/clientTests.xcodeproj/xcshareddata/xcschemes/client.beta.xcscheme': '',
      },
      '/'
    );

    expect(findSchemeNames('/')).toStrictEqual(['client.beta', 'my_app', 'my-app']);
  });
});

describe(getXcodeProjectPath, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/Podfile': 'content',
        'ios/TestPod.podspec': 'noop',
        'ios/testproject/AppDelegate.m': '',
      },
      '/app'
    );

    // More than one
    vol.fromJSON(
      {
        'ios/otherproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.m': '',
      },
      '/multiple'
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it(`returns project path`, () => {
    expect(getXcodeProjectPath('/app')).toBe('/app/ios/testproject.xcodeproj');
  });

  it(`throws when no paths are found`, () => {
    expect(() => getXcodeProjectPath('/none')).toThrow(UnexpectedError);
  });

  it(`warns when multiple paths are found`, () => {
    expect(getXcodeProjectPath('/multiple')).toBe('/multiple/ios/otherproject.xcodeproj');
    expect(WarningAggregator.addWarningIOS).toHaveBeenLastCalledWith(
      'paths-xcodeproj',
      'Found multiple *.xcodeproj file paths, using "ios/otherproject.xcodeproj". Ignored paths: ["ios/testproject.xcodeproj"]'
    );
  });
});

describe(getAppDelegate, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ) as string,
        'ios/Podfile': 'content',
        'ios/TestPod.podspec': 'noop',
        'ios/testproject/AppDelegate.m': '',
        'ios/testproject/AppDelegate.h': '',
      },
      '/objc'
    );

    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ) as string,
        'ios/Podfile': 'content',
        'ios/TestPod.podspec': 'noop',
        'ios/testproject/AppDelegate.swift': '',
      },
      '/swift'
    );

    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ) as string,
        'ios/Podfile': 'content',
        'ios/TestPod.podspec': 'noop',
      },
      '/invalid'
    );

    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ) as string,
        'ios/Podfile': 'content',
        'ios/TestPod.podspec': 'noop',
        'ios/testproject/AppDelegate.swift': '',
        'ios/testproject/AppDelegate.m': '',
        'ios/testproject/AppDelegate.h': '',
      },
      '/confusing'
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it(`returns objc path`, () => {
    expect(getAppDelegate('/objc')).toStrictEqual({
      contents: '',
      path: '/objc/ios/testproject/AppDelegate.m',
      language: 'objc',
    });
  });
  it(`returns swift path`, () => {
    expect(getAppDelegate('/swift')).toStrictEqual({
      contents: '',
      path: '/swift/ios/testproject/AppDelegate.swift',
      language: 'swift',
    });
  });

  it(`throws on invalid project`, () => {
    expect(() => getAppDelegate('/invalid')).toThrow(UnexpectedError);
    expect(() => getAppDelegate('/invalid')).toThrow(/AppDelegate/);
  });

  it(`warns when multiple paths are found`, () => {
    expect(getAppDelegate('/confusing')).toStrictEqual({
      contents: '',
      path: '/confusing/ios/testproject/AppDelegate.m',
      language: 'objc',
    });
    expect(WarningAggregator.addWarningIOS).toHaveBeenLastCalledWith(
      'paths-app-delegate',
      'Found multiple AppDelegate file paths, using "ios/testproject/AppDelegate.m". Ignored paths: ["ios/testproject/AppDelegate.swift"]'
    );
  });
});

describe(getAllInfoPlistPaths, () => {
  beforeAll(async () => {
    const project = {
      'ExampleE2E-tvOS/Info.plist': '',
      'ExampleE2E/Info.plist': '',
      'ExampleE2E-tvOSTests/Info.plist': '',
      'ExampleE2ETests/Info.plist': '',
    };
    vol.fromJSON(project, path.join('/app', 'ios'));
    vol.fromJSON(project, '/app');
  });

  afterAll(() => {
    vol.reset();
  });

  it(`gets paths in order`, () => {
    expect(getAllInfoPlistPaths('/app')).toStrictEqual([
      '/app/ios/ExampleE2E/Info.plist',
      '/app/ios/ExampleE2E-tvOS/Info.plist',
      '/app/ios/ExampleE2ETests/Info.plist',
      '/app/ios/ExampleE2E-tvOSTests/Info.plist',
    ]);
  });
});
