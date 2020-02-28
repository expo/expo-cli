import {
  createForProject,
  getModulesPath,
  getPossibleProjectRoot,
  isUsingYarn,
} from '../PackageManager';

describe('createForProject', () => {
  const projectRoot = '/foo/';
  it(`creates npm package manager from options`, () => {
    const manager = createForProject(projectRoot, { npm: true });
    expect(manager.name).toBe('npm');
  });
  it(`creates yarn package manager from options`, () => {
    const manager = createForProject(projectRoot, { yarn: true });
    expect(manager.name).toBe('Yarn');
  });
  it(`defaults to npm package manager`, () => {
    const manager = createForProject(projectRoot);
    expect(manager.name).toBe('npm');
  });
});

describe('getPossibleProjectRoot', () => {
  it(`returns a string`, () => {
    expect(typeof getPossibleProjectRoot()).toBe('string');
  });
});

describe('getModulesPath', () => {
  it(`returns a string ending in node_modules`, () => {
    expect(getModulesPath(__dirname).endsWith('node_modules')).toBe(true);
  });
});

describe('isUsingYarn', () => {
  it(`returns a boolean`, () => {
    expect(typeof isUsingYarn(__dirname)).toBe('boolean');
  });
});
