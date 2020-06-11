import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';

// import { resolveModule } from '@expo/config';
import { getBareExtensions } from '@expo/config/paths';

export async function buildAsync(
  projectRoot: string,
  mainFile: string,
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
      resolveExtensions: getBareExtensions(['ios', 'native'], {
        isReact: true,
        isTS: true,
        isModern: false,
      }).map(value => `.${value}`),
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
