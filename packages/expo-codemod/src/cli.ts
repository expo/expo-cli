import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import globby from 'globby';
// @ts-ignore
import Runner from 'jscodeshift/src/Runner';
import multimatch from 'multimatch';
import path from 'path';
import parse from 'yargs-parser';

const jscodeshift = require.resolve('jscodeshift/bin/jscodeshift.js');
const transformDir = path.join(__dirname, 'transforms');

const totalStats: { [key: string]: number } = {};

export async function runAsync(argv: string[]) {
  const options = parse(argv);
  const [transform, ...paths] = options._.slice(2);
  const parser = options.parser;

  const transforms = await listTransformsAsync();
  if (options.help || !transform || paths.length === 0) {
    console.log(`
Usage: expo-codemod <transform> <paths...>

Options:
  <transform>                      (required) name of transform to apply to files
                                   (see a list of transforms available below)
  <paths...>                       one or more paths or globs (e.g. ./src/**/*.js) of sources to transform
                                   files in .gitignore are ignored by default
  -h, --help                       print this help message
  -p, --parser <babel|flow|ts|tsx> parser to use to parse the source files
                                   (default: babel, ts or tsx based on the file extension)

Transforms available:
  ${transforms.join('\n  ')}`);
    process.exit(1);
    return;
  }

  if (!transforms.includes(transform)) {
    throw new Error(
      `--transform: Transform ${transform} does not exist. Valid options: ` + transforms.join(', ')
    );
  }

  const allFiles = await globby(paths, { gitignore: true, ignore: ['**/node_modules/**'] });

  if (parser) {
    console.log(`Transforming ${allFiles.length} files using parser '${parser}'...`);
    await transformAsync({ files: allFiles, parser, transform });
  } else {
    const jsFiles = multimatch(allFiles, ['**/*.js', '**/*.jsx']);
    if (jsFiles.length) {
      console.log(`Transforming ${jsFiles.length} JS files...`);
      await transformAsync({ files: jsFiles, parser: 'babel', transform });
    }

    const tsFiles = multimatch(allFiles, ['**/*.ts']);
    if (tsFiles.length) {
      console.log(`Transforming ${tsFiles.length} TS files...`);
      await transformAsync({ files: tsFiles, parser: 'ts', transform });
    }

    const tsxFiles = multimatch(allFiles, ['**/*.tsx']);
    if (tsxFiles.length) {
      console.log(`Transforming ${tsxFiles.length} TSX files...`);
      await transformAsync({ files: tsxFiles, parser: 'tsx', transform });
    }
  }

  if (transform === 'sdk33-imports' || transform === 'sdk37-imports') {
    const packages = Object.keys(totalStats).sort();
    if (packages.length) {
      console.log(
        chalk.bold(
          `\n🆕 Added imports from ${packages.length} packages. Installing packages with \`expo install\`...`
        )
      );
      console.log(`> expo install ${packages.join(' ')}`);
      try {
        await spawnAsync('expo', ['install', ...packages], { stdio: 'inherit' });
      } catch (error: any) {
        console.error(chalk.red('\n⚠️  expo install failed.'));
        console.log(chalk.dim(error.stack));
        console.error(
          chalk.red('To finish the codemod, please install the added packages manually using:')
        );
        console.log(chalk.bold.red(`> expo install ${packages.join(' ')}`));
        process.exit(1);
      }
    }
  }
}

async function transformAsync({
  files,
  parser,
  transform,
}: {
  files: string[];
  parser: 'babel' | 'flow' | 'ts' | 'tsx';
  transform: string;
}) {
  const transformFile = path.join(transformDir, `${transform}.js`);
  if (transform === 'sdk33-imports' || transform === 'sdk37-imports') {
    // Dry run to gather stats about which packages need to be installed.
    const { stats } = await Runner.run(transformFile, files, {
      dry: true,
      silent: true,
      babel: false,
      parser,
    });
    Object.keys(stats).forEach(key => {
      totalStats[key] = (totalStats[key] || 0) + stats[key];
    });
  }

  const args = ['--parser', parser, '--transform', transformFile, '--no-babel', ...files];
  return await spawnAsync(jscodeshift, args, { stdio: 'inherit' });
}

async function listTransformsAsync() {
  const modules = await globby(['*.js'], { cwd: transformDir });
  return modules.map(filename => path.basename(filename, '.js'));
}
