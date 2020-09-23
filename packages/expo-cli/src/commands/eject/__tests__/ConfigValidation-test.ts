import { validatePackage } from '../ConfigValidation';

describe(validatePackage, () => {
  it(`must have at least two components split by a dot`, () => {
    expect(validatePackage('somn')).toBe(false);
    expect(validatePackage('somn.other')).toBe(true);
    expect(validatePackage('a.a.a.a')).toBe(true);
    expect(validatePackage('a_.a.a.a')).toBe(true);
  });
  it(`requires each segment to start with a letter.`, () => {
    expect(validatePackage('1a.2b.c3')).toBe(false);
    expect(validatePackage('a.2b.c')).toBe(false);
    expect(validatePackage('a.b2.c')).toBe(true);
  });
  it(`doesn't allow dashes`, () => {
    expect(validatePackage('a.b-c')).toBe(false);
  });
  it(`doesn't allow special character`, () => {
    expect(validatePackage('com.bacon.©')).toBe(false);
  });
  it(`doesn't allow capitalized`, () => {
    // simple
    expect(validatePackage('a.Catch')).toBe(false);
    // test components
    expect(validatePackage('foo.BAR.int')).toBe(false);
  });
  it(`doesn't allow android reserved words`, () => {
    // simple
    expect(validatePackage('a.b.catch')).toBe(false);
    // test components
    expect(validatePackage('foo.bar.int')).toBe(false);
    // reserved word not exact match.
    expect(validatePackage('somn.foo.falser')).toBe(true);
    expect(validatePackage('while1.package2.void3.transient4')).toBe(true);

    // more reserved works
    expect(validatePackage('foo.bar.abstract')).toBe(false);
    expect(validatePackage('foo.bar.assert')).toBe(false);
  });
});
