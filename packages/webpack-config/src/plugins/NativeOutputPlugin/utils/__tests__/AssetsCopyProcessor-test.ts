import { Chunk, Compilation } from 'webpack';

import { AssetsCopyProcessor } from '../AssetsCopyProcessor';

type Logger = any;

class FsMock {
  ensuredDirs: string[] = [];
  copiedFiles: [string, string][] = [];

  async ensureDir(dir: string) {
    if (!this.ensuredDirs.includes(dir)) {
      this.ensuredDirs.push(dir);
    }
  }

  async copyFile(from: string, to: string) {
    this.copiedFiles.push([from, to]);
  }
}

describe('AssetsCopyProcessor', () => {
  describe('for ios', () => {
    const acpConfigStub = {
      platform: 'ios',
      compilation: ({
        assetsInfo: new Map([
          [
            'index.bundle',
            {
              related: {
                sourceMap: 'index.bundle.map',
              },
            },
          ],
          [
            'src_Async_js.chunk.bundle',
            {
              related: {
                sourceMap: 'src_Async_js.chunk.bundle.map',
              },
            },
          ],
        ]),
      } as unknown) as Compilation,
      outputPath: '/dist',
      bundleOutput: '/target/ios/build/Release-iphonesimulator/main.jsbundle',
      bundleOutputDir: '/target/ios/build/Release-iphonesimulator',
      sourcemapOutput: '/target/ios/build/Release-iphonesimulator/main.jsbundle.map',
      assetsDest: '/target/ios/build/Release-iphonesimulator/App.app',
      logger: ({ debug: jest.fn() } as unknown) as Logger,
    };

    it("should copy entry chunk's files into correct directories", async () => {
      const fs = new FsMock();
      const acp = new AssetsCopyProcessor(acpConfigStub, fs);
      acp.enqueueChunk(
        ({
          files: ['index.bundle'],
          auxiliaryFiles: [
            'assets/node_modules/react-native/libraries/newappscreen/components/logo.png',
            'index.bundle.map',
          ],
        } as unknown) as Chunk,
        { isEntry: true }
      );
      await Promise.all(acp.execute());

      expect(fs.ensuredDirs).toEqual([
        '/target/ios/build/Release-iphonesimulator',
        '/target/ios/build/Release-iphonesimulator/App.app/assets/node_modules/react-native/libraries/newappscreen/components',
      ]);
      expect(fs.copiedFiles).toEqual([
        ['/dist/index.bundle', '/target/ios/build/Release-iphonesimulator/main.jsbundle'],
        ['/dist/index.bundle.map', '/target/ios/build/Release-iphonesimulator/main.jsbundle.map'],
        [
          '/dist/assets/node_modules/react-native/libraries/newappscreen/components/logo.png',
          '/target/ios/build/Release-iphonesimulator/App.app/assets/node_modules/react-native/libraries/newappscreen/components/logo.png',
        ],
      ]);
    });

    it("should copy regular chunk's files into correct directories", async () => {
      const fs = new FsMock();
      const acp = new AssetsCopyProcessor(acpConfigStub, fs);
      acp.enqueueChunk(
        ({
          files: ['src_Async_js.chunk.bundle'],
          auxiliaryFiles: ['src_Async_js.chunk.bundle.map', 'src_Async_js.chunk.bundle.json'],
        } as unknown) as Chunk,
        { isEntry: false }
      );
      await Promise.all(acp.execute());

      expect(fs.ensuredDirs).toEqual(['/target/ios/build/Release-iphonesimulator/App.app']);
      expect(fs.copiedFiles).toEqual([
        [
          '/dist/src_Async_js.chunk.bundle',
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle',
        ],
        [
          '/dist/src_Async_js.chunk.bundle.map',
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle.map',
        ],
        [
          '/dist/src_Async_js.chunk.bundle.json',
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle.json',
        ],
      ]);
    });
  });

  describe('for android', () => {
    const acpConfigStub = {
      platform: 'android',
      compilation: ({
        assetsInfo: new Map([
          [
            'index.bundle',
            {
              related: {
                sourceMap: 'index.bundle.map',
              },
            },
          ],
          [
            'src_Async_js.chunk.bundle',
            {
              related: {
                sourceMap: 'src_Async_js.chunk.bundle.map',
              },
            },
          ],
        ]),
      } as unknown) as Compilation,
      outputPath: '/dist',
      bundleOutput: '/target/generated/assets/react/release/index.android.bundle',
      bundleOutputDir: '/target/generated/assets/react/release',
      sourcemapOutput: '/target/generated/sourcemaps/react/release/index.android.bundle.map',
      assetsDest: '/target/generated/res/react/release',
      logger: ({ debug: jest.fn() } as unknown) as Logger,
    };

    it("should copy entry chunk's files into correct directories", async () => {
      const fs = new FsMock();
      const acp = new AssetsCopyProcessor(acpConfigStub, fs);
      acp.enqueueChunk(
        ({
          files: ['index.bundle'],
          auxiliaryFiles: [
            'drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
            'index.bundle.map',
          ],
        } as unknown) as Chunk,
        { isEntry: true }
      );
      await Promise.all(acp.execute());

      expect(fs.ensuredDirs).toEqual([
        '/target/generated/assets/react/release',
        '/target/generated/sourcemaps/react/release',
        '/target/generated/res/react/release/drawable-mdpi',
      ]);
      expect(fs.copiedFiles).toEqual([
        ['/dist/index.bundle', '/target/generated/assets/react/release/index.android.bundle'],
        [
          '/dist/index.bundle.map',
          '/target/generated/sourcemaps/react/release/index.android.bundle.map',
        ],
        [
          '/dist/drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
          '/target/generated/res/react/release/drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
        ],
      ]);
    });

    it("should copy regular chunk's files into correct directories", async () => {
      const fs = new FsMock();
      const acp = new AssetsCopyProcessor(acpConfigStub, fs);
      acp.enqueueChunk(
        ({
          files: ['src_Async_js.chunk.bundle'],
          auxiliaryFiles: ['src_Async_js.chunk.bundle.map', 'src_Async_js.chunk.bundle.json'],
        } as unknown) as Chunk,
        { isEntry: false }
      );
      await Promise.all(acp.execute());

      expect(fs.ensuredDirs).toEqual([
        '/target/generated/assets/react/release',
        '/target/generated/sourcemaps/react/release',
      ]);
      expect(fs.copiedFiles).toEqual([
        [
          '/dist/src_Async_js.chunk.bundle',
          '/target/generated/assets/react/release/src_Async_js.chunk.bundle',
        ],
        [
          '/dist/src_Async_js.chunk.bundle.map',
          '/target/generated/sourcemaps/react/release/src_Async_js.chunk.bundle.map',
        ],
        [
          '/dist/src_Async_js.chunk.bundle.json',
          '/target/generated/assets/react/release/src_Async_js.chunk.bundle.json',
        ],
      ]);
    });
  });
});
