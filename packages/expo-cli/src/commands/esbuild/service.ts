import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';

// import { resolveModule } from '@expo/config';

import { getBareExtensions } from '@expo/config/paths';

/**
 * Get the platform specific platform extensions in the format that Webpack expects (with a dot prefix).
 *
 * @param platforms supported platforms in order of priority. ex: ios, android, web, native, electron, etc...
 * @category env
 */
function getModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  return getBareExtensions(platforms).map(value => `.${value}`);
}

function getNativeModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  // Disable modern when using `react-native`
  return getBareExtensions(platforms, { isReact: true, isTS: true, isModern: false }).map(
    value => `.${value}`
  );
}

function isPlatformNative(platform: string): boolean {
  return ['ios', 'android'].includes(platform);
}

function getPlatformsExtensions(platform: string): string[] {
  if (isPlatformNative(platform)) {
    return getNativeModuleFileExtensions(platform, 'native');
  }
  return getModuleFileExtensions(platform);
}

export async function buildAsync(
  projectRoot: string,
  mainFile: string,
  platform: string,
  outputPath: string
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));
  console.log('Building: ', mainFile);
  console.log('output: ', outputPath);
  try {
    const { warnings } = await build({
      entryPoints: [
        // resolveModule('react-native/build/polyfills/console.js', projectRoot, {}),
        // resolveModule('react-native/build/polyfills/error-guard.js', projectRoot, {}),
        // resolveModule('react-native/build/polyfills/Object.es7.js', projectRoot, {}),
        mainFile,
      ],
      resolveExtensions: getPlatformsExtensions(platform),
      minify: true,
      bundle: true,
      sourcemap: true,
      target: 'esnext',
      outfile: outputPath,
      loader: { '.js': 'jsx' },
      define: {
        'process.env.NODE_ENV': '"production"',
        __DEV__: 'false',
      },
    });
    const output = fs.readFileSync(outputPath, 'utf8');
    await fs.writeFile(outputPath, 'var global=global||this;' + output);
    console.log('success', { warnings });
  } catch ({ stderr, errors, warnings }) {
    console.error('failure', { stderr, errors, warnings });
  }
}
