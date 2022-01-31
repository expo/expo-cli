import { toPositiveHex } from '../src/utils';

describe(toPositiveHex, () => {
  test.each([
    ['646a60245faa852fe108ecbbd018dfc8', '646a60245faa852fe108ecbbd018dfc8'],
    ['eb668fcee52ce9ebd5461a2e71be1269', '6b668fcee52ce9ebd5461a2e71be1269'], // "negative" hex string
    ['6', '6'],
    ['e', '6'], // "negative" hex string
    ['9', '1'], // "negative" hex string
  ])('case %p', (input, output) => {
    expect(toPositiveHex(input)).toEqual(output);
  });
});
