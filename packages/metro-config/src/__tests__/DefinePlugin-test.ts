import { stringifyObj } from '../DefinePlugin';

const runtime = {
  supportsBigIntLiteral() {
    return false;
  },
};

describe(stringifyObj, () => {
  it(`does`, () => {
    const valueStr = stringifyObj(
      {
        __DEV__: JSON.stringify(true),
        another: {
          nested: true,
        },
        value: 2,
        thing: [JSON.stringify('alpha'), JSON.stringify('beta')],
        large: BigInt(1),
        nullish: null,
        undefinedish: undefined,
      },
      runtime
    );
    expect(valueStr).toBe(
      'Object({"__DEV__":true,"another":{"nested":true},"value":2,"thing":["alpha","beta"],"large":BigInt("1"),"nullish":null,"undefinedish":undefined})'
    );

    expect(eval(valueStr)).toStrictEqual({
      __DEV__: true,
      another: {
        nested: true,
      },
      large: 1n,
      nullish: null,
      thing: ['alpha', 'beta'],
      undefinedish: undefined,
      value: 2,
    });
  });
});
