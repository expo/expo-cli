import { setCustomConfigPath } from '@expo/config';
import { vol } from 'memfs';

import { findProjectRootAsync } from '../ProjectUtils';

jest.mock('fs');
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));

const basicPackageJson = {
  name: 'testing123',
  version: '0.1.0',
  description: 'fake description',
  main: 'index.js',
  dependencies: {
    expo: '0.0.0',
  },
};

const basicAppJson = {};
const exampleProjectPath = '/project';

describe('findProjectRootAsync', () => {
  describe('valid managed app.json and package.json in project', () => {
    beforeAll(() => {
      vol.fromJSON({
        [`${exampleProjectPath}/package.json`]: JSON.stringify(basicPackageJson),
        [`${exampleProjectPath}/app.json`]: JSON.stringify(basicAppJson),
      });
    });

    afterAll(() => {
      vol.reset();
    });

    it('returns the project path and workflow as managed', async () => {
      const { projectRoot, workflow } = await findProjectRootAsync(exampleProjectPath);
      expect(projectRoot).toEqual(exampleProjectPath);
      expect(workflow).toEqual('managed');
    });
  });

  describe('package.json with react-native-unimodules', () => {
    beforeAll(() => {
      const barePackageJson = {
        ...basicPackageJson,
        dependencies: { 'react-native-unimodules': '0.0.0' },
      };

      vol.fromJSON({
        [`${exampleProjectPath}/package.json`]: JSON.stringify(barePackageJson),
        [`${exampleProjectPath}/app.json`]: JSON.stringify(basicAppJson),
      });
    });

    afterAll(() => {
      vol.reset();
    });

    it('returns bare workflow', async () => {
      const { projectRoot, workflow } = await findProjectRootAsync(exampleProjectPath);
      expect(projectRoot).toEqual(exampleProjectPath);
      expect(workflow).toEqual('bare');
    });
  });

  describe('no app.json, no expo, no react-native-unimodules', () => {
    beforeAll(() => {
      const vanillaPackageJson = {
        ...basicPackageJson,
        dependencies: {},
      };
      vol.fromJSON({
        [`${exampleProjectPath}/package.json`]: JSON.stringify(vanillaPackageJson),
      });
    });

    afterAll(() => {
      vol.reset();
    });

    it('returns the project path and bare workflow', async () => {
      const { projectRoot, workflow } = await findProjectRootAsync(exampleProjectPath);
      expect(projectRoot).toEqual(exampleProjectPath);
      expect(workflow).toEqual('bare');
    });
  });

  describe('app.json in separate config path parent directory', () => {
    beforeAll(() => {
      vol.fromJSON({
        [`${exampleProjectPath}/config/app.json`]: JSON.stringify(basicAppJson),
        [`${exampleProjectPath}/package.json`]: JSON.stringify(basicPackageJson),
      });
    });

    afterAll(() => {
      vol.reset();
    });

    it('returns the project path and managed workflow', async () => {
      setCustomConfigPath(exampleProjectPath, `${exampleProjectPath}/config/app.json`);
      const { projectRoot, workflow } = await findProjectRootAsync(exampleProjectPath);
      expect(projectRoot).toEqual(exampleProjectPath);
      expect(workflow).toEqual('managed');
    });
  });

  describe('no valid project', () => {
    it('throws an error if no package.json in directory or its parents', async () => {
      expect.assertions(1);

      try {
        await findProjectRootAsync(exampleProjectPath);
      } catch (e: any) {
        expect(e).toMatchInlineSnapshot(
          `[CommandError: No managed or bare projects found. Please make sure you are inside a project folder.]`
        );
      }
    });
  });
});
