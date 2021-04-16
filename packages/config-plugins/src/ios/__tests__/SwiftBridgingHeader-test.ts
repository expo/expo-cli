import * as fs from 'fs';
import { vol } from 'memfs';
import * as path from 'path';

import {
  ensureSwiftBridgingHeaderSetup,
  getDesignatedSwiftBridgingHeaderFileReference,
} from '../SwiftBridgingHeader';
import { getPbxproj } from '../utils/Xcodeproj';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

describe(ensureSwiftBridgingHeaderSetup, () => {
  const projectRoot = '/alpha';
  const projectRootSwift = '/swift';
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project-swift.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.swift': '',
      },
      projectRootSwift
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it(`creates a bridging header when none are designated`, () => {
    const project = getPbxproj(projectRoot);
    // perform action
    ensureSwiftBridgingHeaderSetup({ projectRoot, project });

    expect(getDesignatedSwiftBridgingHeaderFileReference({ project })).toBe(
      'testproject/testproject-Bridging-Header.h'
    );

    expect(
      vol.existsSync(path.join(projectRoot, 'ios/testproject/testproject-Bridging-Header.h'))
    ).toBe(true);
  });

  it(`skips creating a bridging header when using swift`, () => {
    const project = getPbxproj(projectRootSwift);
    // perform action
    ensureSwiftBridgingHeaderSetup({ projectRoot: projectRootSwift, project });

    // Won't link a bridging header
    expect(getDesignatedSwiftBridgingHeaderFileReference({ project })).toBe(null);

    expect(
      vol.existsSync(path.join(projectRootSwift, 'ios/testproject/testproject-Bridging-Header.h'))
    ).toBe(false);
  });
});
