import { getScheme, setScheme } from '../Scheme';

describe('scheme', () => {
  it(`returns null if no scheme is provided`, () => {
    expect(getScheme({})).toBe(null);
  });

  it(`returns the scheme if provided`, () => {
    expect(getScheme({ scheme: 'myapp' })).toBe('myapp');
  });

  it(`sets the CFBundleUrlTypes if scheme is given`, () => {
    expect(setScheme({ scheme: 'myapp' }, {})).toMatchObject({
      CFBundleURLTypes: [{ CFBundleURLSchemes: ['myapp'] }],
    });
  });

  it(`makes no changes to the infoPlist no scheme is provided`, () => {
    expect(setScheme({}, {})).toMatchObject({});
  });
});
