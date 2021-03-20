import { extractCodeSigningInfo, extractSigningId } from '../getDevelopmentTeamAsync';

describe(extractSigningId, () => {
  it(`extracts`, () => {
    expect(extractSigningId('Apple Development: Evan Bacon (AA00AABB0A)')).toBe('AA00AABB0A');
  });
});
describe(extractCodeSigningInfo, () => {
  it(`extracts`, () => {
    expect(
      extractSigningId(
        '  2) 12312234253761286351826735HGKDHAJGF45283 "Apple Development: bacon@expo.io (BB00AABB0A)"'
      )
    ).toBe('Apple Development: Evan Bacon (PH75MDXG4H)');
  });
});
