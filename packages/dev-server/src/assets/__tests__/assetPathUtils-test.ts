/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { filterPlatformAssetScales } from '../assetPathUtils';

describe(filterPlatformAssetScales, () => {
  it('only supports [1,2,3]x on iOS', () => {
    expect(filterPlatformAssetScales('ios', [1, 1.5, 2, 3, 4])).toStrictEqual([1, 2, 3]);
    expect(filterPlatformAssetScales('ios', [3, 4])).toStrictEqual([3]);
  });

  it('rounds to the optimal scales', () => {
    expect(filterPlatformAssetScales('ios', [0.5, 4, 5, 6, 100])).toStrictEqual([4]);
    expect(filterPlatformAssetScales('ios', [0.5, 50])).toStrictEqual([50]);
  });

  it('do nothing when no scales are provided', () => {
    expect(filterPlatformAssetScales('android', [])).toStrictEqual([]);
    expect(filterPlatformAssetScales('ios', [])).toStrictEqual([]);
  });
  it('does nothing on unspec', () => {
    expect(filterPlatformAssetScales('freebsd', [1, 1.5, 2, 3.7])).toStrictEqual([1, 1.5, 2, 3.7]);
  });
});
