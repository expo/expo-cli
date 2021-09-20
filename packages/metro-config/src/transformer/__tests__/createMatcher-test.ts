import { createKnownCommunityMatcher } from '../createMatcher';

describe(createKnownCommunityMatcher, () => {
  it(`tests application code`, () => {
    expect(
      createKnownCommunityMatcher().test('node_modules/@react-native-community/foobar.js')
    ).toBe(false);
  });
});
