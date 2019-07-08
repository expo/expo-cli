'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
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
        result.done
          ? resolve(result.value)
          : new P(function(resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __rest =
  (this && this.__rest) ||
  function(s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === 'function')
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++)
        if (e.indexOf(p[i]) < 0) t[p[i]] = s[p[i]];
    return t;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const chalk_1 = __importDefault(require('chalk'));
const deep_diff_1 = __importDefault(require('deep-diff'));
const config_1 = require('@expo/config');
const fs_1 = __importDefault(require('fs'));
const getPathsAsync_1 = __importDefault(require('./getPathsAsync'));
// https://stackoverflow.com/a/51319962/4047926
function colorizeKeys(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function(match) {
      if (/--pop/.test(match)) {
        // Bacon: If a key is prefixed with --pop it'll be colored red
        return chalk_1.default.red.bold(match.substring(0, match.length - 7) + '":');
      } else if (/--push/.test(match)) {
        // Bacon: If a key is prefixed with --push it'll be colored green
        return chalk_1.default.green.bold(match.substring(0, match.length - 8) + '":');
      } else if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return chalk_1.default.magenta(match);
        } else {
          return chalk_1.default.blueBright(match);
        }
      } else if (/true|false/.test(match)) {
        return chalk_1.default.cyanBright(match);
      } else if (/null/.test(match)) {
        return chalk_1.default.cyan(match);
      }
      return chalk_1.default.green(match);
    }
  );
}
function logHeader(title) {
  console.log(
    chalk_1.default.hidden('<details><summary>\n') +
      chalk_1.default.bgGreen.black(`[${title}]\n`) +
      chalk_1.default.hidden('</summary>\n')
  );
}
function logMdHelper(...messages) {
  console.log(chalk_1.default.hidden(...messages));
}
function logFooter() {
  logMdHelper('</details>');
}
// Log the main risky parts of webpack.config
function logWebpackConfigComponents(webpackConfig) {
  logHeader('Webpack Info');
  const {
    mode,
    resolve: { alias = {} } = {},
    entry,
    devtool,
    context,
    devServer: { https, hot, contentBase } = {},
  } = webpackConfig;
  // console.log('WEBPACK', JSON.stringify(webpackConfig, null, 2));
  logMdHelper('```json');
  console.log(
    colorizeKeys({
      mode,
      devtool,
      entry,
      context,
      https,
      hot,
      contentBase,
      alias,
    })
  );
  logMdHelper('```');
  logFooter();
}
function logStaticsAsync(env = {}) {
  return __awaiter(this, void 0, void 0, function*() {
    logHeader('Statics Info');
    const paths = yield getPathsAsync_1.default(env);
    // Detect if the default template files aren't being used.
    const { template: statics = {} } = paths;
    const expectedLocation = 'webpack-config/web-default/';
    for (const key of Object.keys(statics)) {
      const filePath = statics[key];
      if (typeof filePath !== 'string') continue;
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      let message =
        chalk_1.default.default(`- **${key}**: `) + chalk_1.default.blue(`\`${fileName}\``) + ' : ';
      if (filePath.includes(expectedLocation)) {
        message += chalk_1.default.bgGreen.black(`\`${filePath}\``);
      } else {
        message += chalk_1.default.bgRed.black(`\`${filePath}\``);
      }
      console.log(message);
    }
    logFooter();
  });
}
function logEnvironment(_a = {}) {
  var { config } = _a,
    env = __rest(_a, ['config']);
  logHeader('Environment Info');
  logMdHelper('```json');
  console.log(colorizeKeys(env));
  logMdHelper('```');
  logFooter();
}
function setDeepValue(pathComponents, object, value) {
  if (!pathComponents.length) {
    return;
  }
  const key = pathComponents.shift();
  if (!(key in object)) {
    if (pathComponents.length) object[key] = {};
    else {
      if (value.kind === 'N') {
        object[key] = value.lhs;
      } else {
        if ('rhs' in value) object[`${key}--push`] = value.rhs;
        if ('lhs' in value) object[`${key}--pop`] = value.lhs;
      }
    }
  }
  setDeepValue(pathComponents, object[key], value);
}
function logAutoConfigValuesAsync(env) {
  return __awaiter(this, void 0, void 0, function*() {
    const locations = yield getPathsAsync_1.default(env);
    const config = config_1.readConfigJson(env.projectRoot);
    const standardConfig = config_1.ensurePWAConfig({}, locations.absolute, {
      templateIcon: locations.template.get('icon.png'),
    });
    const pwaConfig = config_1.ensurePWAConfig(config, locations.absolute, {
      templateIcon: locations.template.get('icon.png'),
    });
    const nonStandard = deep_diff_1.default(standardConfig, pwaConfig);
    let obj = {};
    for (const diff of nonStandard) {
      // console.log(chalk.bold(diff.path.join('/') + ': ') + chalk.bgRed(JSON.stringify(diff.rhs, null, 2)));
      // TODO: Bacon: add support for array updates: https://www.npmjs.com/package/deep-diff#differences
      if (diff.kind !== 'A') {
        setDeepValue(diff.path, obj, diff);
      }
    }
    logHeader('App.json');
    logMdHelper('```json');
    // TODO: Bacon: Diff block
    console.log(colorizeKeys(obj));
    logMdHelper('```');
    logFooter();
  });
}
function reportAsync(webpackConfig, _a = {}) {
  var { config } = _a,
    env = __rest(_a, ['config']);
  return __awaiter(this, void 0, void 0, function*() {
    console.log(chalk_1.default.bold('\n\nStart Copy\n\n'));
    logWebpackConfigComponents(webpackConfig);
    logEnvironment(env);
    yield logStaticsAsync(env);
    yield logAutoConfigValuesAsync(env);
    const locations = yield getPathsAsync_1.default(env);
    yield testBabelPreset(locations);
    console.log(chalk_1.default.bold('\nEnd Copy\n\n'));
  });
}
function testBabelPreset(locations) {
  return __awaiter(this, void 0, void 0, function*() {
    logHeader('Babel Preset');
    const babelrc = locations.absolute('.babelrc');
    const babelConfig = locations.absolute('babel.config.js');
    const printPassed = (message, ...messages) =>
      console.log(chalk_1.default.bgGreen.black(`- [✔︎ ${message}]`, ...messages));
    const printWarning = (message, ...messages) =>
      console.log(chalk_1.default.bgYellow.black(`- [${message}]`, ...messages));
    const printFailed = (message, ...messages) =>
      console.log(chalk_1.default.bgRed.black(`- [x ${message}]`, ...messages));
    if (fs_1.default.existsSync(babelrc)) {
      printFailed(
        'Using `.babelrc`',
        'Please upgrade to Babel 7, and replace `.babelrc` with `babel.config.js`'
      );
    } else {
      printPassed('Not using .babelrc', 'Expo web runs best with Babel 7+');
    }
    const printFailedToParse = (...messages) =>
      printWarning(`Expo CLI cannot parse your babel.config.js at ${babelConfig}.`, ...messages);
    function testBabelConfig(config, isFunction) {
      const preferred =
        'It should be returning an object with `{ "presets: ["babel-preset-expo"]" }`.';
      if (!config) {
        if (isFunction) {
          printWarning(
            '`babel.config.js` is exporting a function that evaluates to a null object',
            preferred
          );
        } else {
          printWarning('`babel.config.js` is exporting a `null` object', preferred);
        }
        return;
      } else if (!Array.isArray(config.presets)) {
        const missingKey = ' without the "presets" key';
        if (isFunction) {
          printWarning(
            '`babel.config.js` is exporting a function that evaluates to an object' + missingKey,
            preferred
          );
        } else {
          printWarning('`babel.config.js` is exporting an object' + missingKey, preferred);
        }
        return;
      }
      const isExpo = preset => preset === 'expo' || preset === 'babel-preset-expo';
      const hasExpoPreset = (() => {
        for (const preset of config.presets) {
          if (
            (typeof preset === 'string' && isExpo(preset)) ||
            (Array.isArray(preset) && isExpo(preset[0]))
          ) {
            return true;
          }
        }
        return false;
      })();
      if (hasExpoPreset) {
        printPassed('Using `babel-preset-expo`', 'Tree-shaking should work as expected.');
      } else {
        printWarning(
          'Not using `babel-preset-expo`',
          `This is highly recommended as it'll greatly improve tree-shaking in most cases.`,
          `\nRun \`yarn add babel-preset-expo\` and add it to the "presets" array of your \`babel.config.js\`.`
        );
      }
    }
    if (fs_1.default.existsSync(babelConfig)) {
      const configObjectOrFunction = require(require.resolve(babelConfig));
      if (isFunction(configObjectOrFunction)) {
        try {
          const results = yield configObjectOrFunction({ cache() {} });
          testBabelConfig(results, true);
        } catch (error) {
          printFailedToParse(
            `Is it exporting something other than an object or function?`,
            `If it's exporting a function ensure that function returns a valid object containing the "presets" key.`,
            `If it's exporting an object ensure it contains the "presets" key.`
          );
        }
      } else {
        testBabelConfig(configObjectOrFunction);
      }
    }
    logFooter();
  });
}
function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
module.exports = {
  reportAsync,
};
//# sourceMappingURL=Diagnosis.js.map
