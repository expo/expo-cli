import { getConfigFieldValue } from '../BuildPropertiesCommon';

describe(getConfigFieldValue, () => {
  it('should return string value', () => {
    expect(getConfigFieldValue({ name: 'hello' }, 'name')).toBe('hello');
  });

  it('should throw error when result value is not string', () => {
    expect(() =>
      getConfigFieldValue({ ios: { bundleIdentifier: 'com.example' } }, 'ios')
    ).toThrowError();
  });

  it('should access nested object through dot notation', () => {
    expect(
      getConfigFieldValue({ ios: { bundleIdentifier: 'com.example' } }, 'ios.bundleIdentifier')
    ).toBe('com.example');
  });

  it('should return null when field not found', () => {
    expect(getConfigFieldValue({ name: 'hello' }, 'notfound')).toBeNull();
    expect(
      getConfigFieldValue({ ios: { bundleIdentifier: 'com.example' } }, 'ios.notfound')
    ).toBeNull();
  });
});
