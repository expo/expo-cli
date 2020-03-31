import { join } from 'path';

import { findAndEvalConfig } from '../getConfig';

describe('findAndEvalConfig', () => {
  it(`throws a useful error for JS configs with a syntax error`, () => {
    expect(() =>
      findAndEvalConfig({
        projectRoot: join(__dirname, 'fixtures/behavior/syntax-error'),
        config: {},
      })
    ).toThrowError('Unexpected token (3:4)');
  });
});
