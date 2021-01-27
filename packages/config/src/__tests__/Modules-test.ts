import { moduleNameFromPath } from '../Modules';

describe('moduleNameFromPath', () => {
  it(`returns the module name from a path`, () => {
    expect(moduleNameFromPath('foo/bar/expo.js')).toBe('foo');
    expect(moduleNameFromPath('foo')).toBe('foo');
  });
  it(`returns the module name from a path with org`, () => {
    expect(moduleNameFromPath('@myorg/somn/bar/expo.js')).toBe('@myorg/somn');
  });
  it(`returns the org name if the package is missing`, () => {
    expect(moduleNameFromPath('@myorg')).toBe('@myorg');
  });
});
