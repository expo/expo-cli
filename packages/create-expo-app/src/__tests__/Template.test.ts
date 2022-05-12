import { resolvePackageModuleId } from '../Template';

describe(resolvePackageModuleId, () => {
  it(`resolves 'file:' path`, () => {
    expect(resolvePackageModuleId('file:./path/to/template.tgz')).toEqual({
      type: 'file',
      uri: './path/to/template.tgz',
    });
  });
  it(`resolves darwin local path`, () => {
    expect(resolvePackageModuleId('./path/to/template.tgz')).toEqual({
      type: 'file',
      uri: './path/to/template.tgz',
    });
  });
  it(`resolves windows local path`, () => {
    expect(resolvePackageModuleId('.\\path\\to\\template.tgz')).toEqual({
      type: 'file',
      uri: '.\\path\\to\\template.tgz',
    });
  });
  it(`resolves module ID`, () => {
    expect(resolvePackageModuleId('@expo/basic@34.0.0')).toEqual({
      type: 'npm',
      uri: '@expo/basic@34.0.0',
    });
    expect(resolvePackageModuleId('basic')).toEqual({
      type: 'npm',
      uri: 'basic',
    });
  });
});
