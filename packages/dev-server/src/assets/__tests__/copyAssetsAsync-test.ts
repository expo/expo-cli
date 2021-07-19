/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import assert from 'assert';
import path from 'path';

import { getAssetDestinationPath } from '../copyAssetsAsync';

describe(getAssetDestinationPath, () => {
  describe('android', () => {
    it('should use the right destination folder', () => {
      const asset = {
        name: 'icon',
        type: 'png',
        httpServerLocation: '/assets/test',
      };

      const expectDestPathForScaleToStartWith = (scale: number, location: string) => {
        assert(
          getAssetDestinationPath('android', asset, scale).startsWith(location),
          `asset for scale ${scale} should start with path '${location}'`
        );
      };

      expectDestPathForScaleToStartWith(1, 'drawable-mdpi');
      expectDestPathForScaleToStartWith(1.5, 'drawable-hdpi');
      expectDestPathForScaleToStartWith(2, 'drawable-xhdpi');
      expectDestPathForScaleToStartWith(3, 'drawable-xxhdpi');
      expectDestPathForScaleToStartWith(4, 'drawable-xxxhdpi');
    });

    it('should lowercase path', () => {
      const asset = {
        name: 'Icon',
        type: 'png',
        httpServerLocation: '/assets/App/Test',
      };

      expect(getAssetDestinationPath('android', asset, 1)).toBe(
        path.normalize('drawable-mdpi/app_test_icon.png')
      );
    });

    it('should remove `assets/` prefix', () => {
      const asset = {
        name: 'icon',
        type: 'png',
        httpServerLocation: '/assets/RKJSModules/Apps/AndroidSample/Assets',
      };

      expect(getAssetDestinationPath('android', asset, 1).startsWith('assets_')).toBeFalsy();
    });

    it('should put non-drawable resources to `raw/`', () => {
      const asset = {
        name: 'video',
        type: 'mp4',
        httpServerLocation: '/assets/app/test',
      };

      expect(getAssetDestinationPath('android', asset, 1)).toBe(
        path.normalize('raw/app_test_video.mp4')
      );
    });

    it('should handle assets with a relative path outside of root', () => {
      const asset = {
        name: 'icon',
        type: 'png',
        httpServerLocation: '/assets/../../test',
      };

      expect(getAssetDestinationPath('android', asset, 1)).toBe(
        path.normalize('drawable-mdpi/__test_icon.png')
      );
    });
  });

  describe('ios', () => {
    it('should build correct path', () => {
      const asset = {
        name: 'icon',
        type: 'png',
        httpServerLocation: '/assets/test',
      };

      expect(getAssetDestinationPath('ios', asset, 1)).toBe(path.normalize('assets/test/icon.png'));
    });

    it('should consider scale', () => {
      const asset = {
        name: 'icon',
        type: 'png',
        httpServerLocation: '/assets/test',
      };

      expect(getAssetDestinationPath('ios', asset, 2)).toBe(
        path.normalize('assets/test/icon@2x.png')
      );
      expect(getAssetDestinationPath('ios', asset, 3)).toBe(
        path.normalize('assets/test/icon@3x.png')
      );
    });

    it('should handle assets with a relative path outside of root', () => {
      const asset = {
        name: 'icon',
        type: 'png',
        httpServerLocation: '/assets/../../test',
      };

      expect(getAssetDestinationPath('ios', asset, 1)).toBe(
        path.normalize('assets/__test/icon.png')
      );
    });
  });
});
