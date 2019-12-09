#!/usr/bin/env node
'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function(resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const chalk_1 = __importDefault(require('chalk'));
const commander_1 = require('commander');
const path_1 = require('path');
const assets_1 = require('./assets');
const update_1 = __importDefault(require('./update'));
let projectDirectory = '';
const packageJson = () => require('../package.json');
const program = new commander_1.Command(packageJson().name)
  .version(packageJson().version)
  .arguments('<project-directory>')
  .usage(`${chalk_1.default.green('<project-directory>')} [options]`)
  .description('Compress the assets in your Expo project')
  // TODO: (verbose option): log the include, exclude options
  .option('-s, --save', 'Save the original assets with a .orig extension')
  .option(
    '-q, --quality [number]',
    'Specify the quality the compressed image is reduced to. Default is 80'
  )
  .option(
    '-i, --include [pattern]',
    'Include only assets that match this glob pattern relative to the project root'
  )
  .option(
    '-e, --exclude [pattern]',
    'Exclude all assets that match this glob pattern relative to the project root'
  )
  .action(inputProjectDirectory => (projectDirectory = inputProjectDirectory))
  .allowUnknownOption()
  .parse(process.argv);
function run() {
  return __awaiter(this, void 0, void 0, function*() {
    // Space out first line
    console.log();
    if (typeof projectDirectory === 'string') {
      projectDirectory = projectDirectory.trim();
    }
    const resolvedProjectRoot = path_1.resolve(projectDirectory);
    const optimizationOptions = {
      save: program.save,
      include: program.include,
      exclude: program.exclude,
      quality: parseQuality(),
    };
    const isProjectOptimized = yield assets_1.isProjectOptimized(
      resolvedProjectRoot,
      optimizationOptions
    );
    if (!program.save && !isProjectOptimized) {
      console.warn(chalk_1.default.bgYellow.black('This will overwrite the original assets.'));
    }
    yield assets_1.optimizeAsync(resolvedProjectRoot, optimizationOptions);
  });
}
function parseQuality() {
  //   const defaultQuality = 80;
  if (program.quality == null) {
    return undefined;
  }
  const quality = Number(program.quality);
  if (!(Number.isInteger(quality) && quality > 0 && quality <= 100)) {
    throw new Error('Invalid value for --quality flag. Must be an integer between 1 and 100.');
  }
  return quality;
}
run()
  .then(update_1.default)
  .catch(reason =>
    __awaiter(void 0, void 0, void 0, function*() {
      console.log();
      console.log('Aborting run');
      if (reason.command) {
        console.log(`  ${chalk_1.default.magenta(reason.command)} has failed.`);
      } else {
        console.log(
          chalk_1.default.red`An unexpected error was encountered. Please report it as a bug:`
        );
        console.log(reason);
      }
      console.log();
      yield update_1.default();
      process.exit(1);
    })
  );
//# sourceMappingURL=index.js.map
