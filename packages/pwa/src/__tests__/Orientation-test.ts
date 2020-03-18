import * as Orientation from '../Orientation';

describe('isValid', () => {
  it(`works`, () => {
    expect(Orientation.isValid(false as any)).toBe(false);
    expect(Orientation.isValid(72 as any)).toBe(false);
    expect(Orientation.isValid(null as any)).toBe(false);
    expect(Orientation.isValid('any')).toBe(true);
  });
});

it(`can overlap isLandscape and isPortrait`, () => {
  expect(Orientation.isLandscape('omit')).toBe(true);
  expect(Orientation.isPortrait('omit')).toBe(true);
});
