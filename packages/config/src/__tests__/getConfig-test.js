import { join } from 'path';

import { getConfigFilePaths } from '../Config';
import { getDynamicConfig } from '../getConfig';

describe('getDynamicConfig', () => {
  // This tests error are thrown properly and ensures that a more specific
  // config is used instead of defaulting to a valid substitution.
  it(`throws a useful error for dynamic configs with a syntax error`, () => {
    const paths = getConfigFilePaths(join(__dirname, 'fixtures/behavior/syntax-error'));
    expect(() => getDynamicConfig(paths.dynamicConfigPath, {})).toThrowError(
      'Unexpected token (3:4)'
    );
  });
});
