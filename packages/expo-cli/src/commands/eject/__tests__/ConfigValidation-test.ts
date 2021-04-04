import { validateBundleId } from '../ConfigValidation';

describe(validateBundleId, () => {
  it(`validates`, () => {
    expect(validateBundleId('bacon')).toBe(true);
    expect(validateBundleId('...b.a.-c.0.n...')).toBe(true);
    expect(validateBundleId('.')).toBe(true);
    expect(validateBundleId('. ..')).toBe(false);
    expect(validateBundleId('_')).toBe(false);
    expect(validateBundleId(',')).toBe(false);
  });
});
