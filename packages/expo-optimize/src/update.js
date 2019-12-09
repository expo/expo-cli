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
const child_process_1 = require('child_process');
// @ts-ignore
const update_check_1 = __importDefault(require('update-check'));
function shouldUseYarn() {
  try {
    child_process_1.execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}
function shouldUpdate() {
  return __awaiter(this, void 0, void 0, function*() {
    const packageJson = () => require('../package.json');
    const update = update_check_1.default(packageJson()).catch(() => null);
    try {
      const res = yield update;
      if (res && res.latest) {
        const isYarn = shouldUseYarn();
        const _packageJson = packageJson();
        console.log();
        console.log(
          chalk_1.default.yellow.bold(`A new version of \`${_packageJson.name}\` is available`)
        );
        console.log(
          'You can update by running: ' +
            chalk_1.default.cyan(
              isYarn ? `yarn global add ${_packageJson.name}` : `npm i -g ${_packageJson.name}`
            )
        );
        console.log();
      }
    } catch (_a) {
      // ignore error
    }
  });
}
exports.default = shouldUpdate;
//# sourceMappingURL=update.js.map
