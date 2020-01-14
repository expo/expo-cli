import { serializeAndEvaluate } from '../getConfig';

describe('serializeAndEvaluate', () => {
  it(`serializes item`, () => {
    expect(
      serializeAndEvaluate({
        foo: 'bar',
        boo: true,
        inn: 200,
        then: [true, { foo: 'bar' }],
        fun: () => ({ time: ['val'] }),
        last: {
          bar: 'foo',
          kid: [2, 'yo'],
        },
      })
    ).toMatchSnapshot();
  });
});
