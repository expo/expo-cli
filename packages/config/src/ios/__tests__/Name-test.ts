import { getName, setDisplayName, setName } from '../Name';

describe('name', () => {
  it(`returns null if no bundleIdentifier is provided`, () => {
    expect(getName({})).toBe(null);
  });

  it(`returns the name if provided`, () => {
    expect(getName({ name: 'Some iOS app' })).toBe('Some iOS app');
  });

  it(`sets the CFBundleDisplayName if name is given`, () => {
    expect(setDisplayName({ name: 'Expo app' }, {})).toMatchObject({
      CFBundleDisplayName: 'Expo app',
    });
  });

  it(`makes no changes to the infoPlist no name is provided`, () => {
    expect(setName({}, {})).toMatchObject({});
  });
});
