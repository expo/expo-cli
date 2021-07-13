import * as fs from 'fs-extra';
import { vol } from 'memfs';
import path from 'path';

import { setProvisioningProfileForPbxproj } from '../ProvisioningProfile';

jest.mock('fs');

const originalFs = jest.requireActual('fs') as typeof fs;

describe('ProvisioningProfile module', () => {
  describe(setProvisioningProfileForPbxproj, () => {
    const projectRoot = '/testproject';
    const pbxProjPath = 'ios/testproject.xcodeproj/project.pbxproj';

    beforeEach(() => {
      vol.fromJSON(
        {
          [pbxProjPath]: originalFs.readFileSync(
            path.join(__dirname, 'fixtures/project.pbxproj'),
            'utf-8'
          ),
        },
        projectRoot
      );
    });
    afterEach(() => {
      vol.reset();
    });

    it('configures the project.pbxproj file with the profile name and apple team id', () => {
      setProvisioningProfileForPbxproj(projectRoot, {
        profileName: '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
        appleTeamId: 'J5FM626PE2',
      });
      const pbxprojContents = fs.readFileSync(path.join(projectRoot, pbxProjPath), 'utf-8');
      expect(pbxprojContents).toMatchSnapshot();
    });
    it('throws descriptive error when target name does not exist', () => {
      expect(() =>
        setProvisioningProfileForPbxproj(projectRoot, {
          targetName: 'faketargetname',
          profileName: '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
          appleTeamId: 'J5FM626PE2',
        })
      ).toThrow("Could not find target 'faketargetname' in project.pbxproj");
    });
  });
});
