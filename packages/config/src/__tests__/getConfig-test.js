import { join } from 'path';

import { getConfigFilePaths } from '../Config';
import { getDynamicConfig } from '../getConfig';

describe('getDynamicConfig', () => {
  it(`throws a useful error for JS configs with a syntax error`, () => {
    const paths = getConfigFilePaths(join(__dirname, 'fixtures/behavior/syntax-error'));
    expect(() => getDynamicConfig(paths.dynamicConfigPath, {})).toThrowError(
      'Unexpected token (3:4)'
    );
  });
});
