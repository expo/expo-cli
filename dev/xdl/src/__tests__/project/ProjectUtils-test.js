jest.mock('analytics-node');
jest.mock('fs');

const mkdirp = require('mkdirp');
const mockfs = require('mock-fs');
const path = require('path');
const slugify = require('slugify');

import * as ProjectUtils from '../../project/ProjectUtils';
import Config from '../../Config';

const packageJson = {
  name: 'testing123',
  version: '0.5.0',
};

// these are intentionally different from package.json -- easy way to test fallbacks
const expJson = {
  sdkVersion: '12.0.0',
  name: 'My New Project',
  slug: 'my-new-project',
  version: '1.0.0',
};

const appJson = {
  expo: {
    sdkVersion: '12.0.0',
  },
};

const packageJsonWithExp = {
  name: 'testing456',
  version: '0.7.0',
  exp: expJson,
};

const expJsonWithNodeModulesPath = {
  sdkVersion: '12.0.0',
  name: 'My New Project',
  slug: 'my-new-project',
  version: '1.0.0',
  nodeModulesPath: 'node-modules-path',
};

function setupDirs() {
  const fs = require('fs');

  const packageJsonString = JSON.stringify(packageJson, null, 2);
  fs.__configureFs({
    '/home/mocky/appjson/package.json': packageJsonString,
    '/home/mocky/appjson/app.json': JSON.stringify(appJson, null, 2),
    '/home/mocky/expjson/package.json': packageJsonString,
    '/home/mocky/expjson/exp.json': JSON.stringify(expJson, null, 2),
    '/home/mocky/nojson/package.json': JSON.stringify(
      packageJsonWithExp,
      null,
      2
    ),
    '/home/mocky/expjson-with-node-modules/exp.json': JSON.stringify(
      expJsonWithNodeModulesPath,
      null,
      2
    ),
    '/home/mocky/expjson-with-node-modules/node-modules-path/package.json': packageJsonString,
  });
}

describe('configFilenameAsync', () => {
  beforeEach(async () => {
    setupDirs();
  });

  afterEach(() => {
    mockfs.restore();
  });

  it('checks configfile heuristics are correct', async () => {
    const appJson = await ProjectUtils.configFilenameAsync(
      '/home/mocky/appjson'
    );
    expect(appJson).toEqual('app.json');

    const expJson = await ProjectUtils.configFilenameAsync(
      '/home/mocky/expjson'
    );
    expect(expJson).toEqual('exp.json');

    const prevDevTool = Config.developerTool;

    Config.developerTool = 'exp';
    const noExpJson = await ProjectUtils.configFilenameAsync('/doesntexist');
    expect(noExpJson).toEqual('exp.json');

    Config.developerTool = 'crna';
    const noAppJson = await ProjectUtils.configFilenameAsync('/doesntexist');
    expect(noAppJson).toEqual('app.json');

    Config.developerTool = prevDevTool;
  });
});

describe('readConfigJsonAsync', () => {
  beforeEach(async () => {
    setupDirs();
  });

  afterEach(() => {
    mockfs.restore();
  });

  it('parses a project root with a normal exp.json', async () => {
    const { exp, pkg } = await ProjectUtils.readConfigJsonAsync(
      '/home/mocky/expjson'
    );

    expect(exp).toEqual(expJson);
    expect(pkg).toEqual(packageJson);
  });

  it('parses a project root with only a package.json', async () => {
    const { exp, pkg } = await ProjectUtils.readConfigJsonAsync(
      '/home/mocky/nojson'
    );

    expect(exp).toEqual(expJson);
    expect(pkg).toEqual(packageJsonWithExp);
  });

  it('parses a project root with an app.json relying on package.json fallbacks', async () => {
    const { exp, pkg } = await ProjectUtils.readConfigJsonAsync(
      '/home/mocky/appjson'
    );

    expect(exp.sdkVersion).toEqual(appJson.expo.sdkVersion);
    expect(exp.version).toEqual(packageJson.version);
    expect(exp.name).toEqual(packageJson.name);
    expect(exp.slug).toEqual(slugify(packageJson.name));

    expect(pkg).toEqual(packageJson);
  });

  it('reads package.json at nodeModulesPath', async () => {
    const { exp, pkg } = await ProjectUtils.readConfigJsonAsync(
      '/home/mocky/expjson-with-node-modules'
    );

    expect(exp).toEqual(expJsonWithNodeModulesPath);
    expect(pkg).toEqual(packageJson);
  });
});
