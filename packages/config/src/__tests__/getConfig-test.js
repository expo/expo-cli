import { join } from 'path';

import { findAndEvalConfig, serializeAndEvaluate } from '../getConfig';

describe('serializeAndEvaluate', () => {
  it(`serializes item`, () => {
    expect(
      serializeAndEvaluate({
        foo: 'bar',
        boo: true,
        inn: 200,
        then: [true, { foo: 'bar' }],
        alpha: () => ({ beta: ['val'] }),
        last: {
          bar: 'foo',
          charlie: [2, 'delta'],
        },
      })
    ).toMatchSnapshot();
  });
});

describe('findAndEvalConfig', () => {
  it(`throws a useful error for JS configs with a syntax error`, () => {
    expect(() =>
      findAndEvalConfig({
        mode: 'development',
        projectRoot: join(__dirname, 'fixtures/behavior/syntax-error'),
        config: {},
      })
    ).toThrowError('Unexpected token (3:4)');
  });
});
