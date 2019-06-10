const chalk = require('chalk');
const diff = require('deep-diff');
const { ensurePWAConfig, readConfigJson } = require('@expo/config');
const fs = require('fs');
const getPaths = require('./getPaths');

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
        return chalk.red.bold(match.substring(0, match.length - 7) + '":');
      } else if (/--push/.test(match)) {
        // Bacon: If a key is prefixed with --push it'll be colored green
        return chalk.green.bold(match.substring(0, match.length - 8) + '":');
      } else if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return chalk.magenta(match);
        } else {
          return chalk.blueBright(match);
        }
      } else if (/true|false/.test(match)) {
        return chalk.cyanBright(match);
      } else if (/null/.test(match)) {
        return chalk.cyan(match);
      }
      return chalk.green(match);
    }
  );
}

function logHeader(title) {
  console.log(
    chalk.hidden('<details><summary>\n') +
      chalk.bgGreen.black(`[${title}]\n`) +
      chalk.hidden('</summary>\n')
  );
}
function logMdHelper(...messages) {
  console.log(chalk.hidden(...messages));
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

function logStatics(env = {}) {
  logHeader('Statics Info');

  const paths = getPaths(env);

  // Detect if the default template files aren't being used.
  const { template: statics = {} } = paths;

  const expectedLocation = 'webpack-config/web-default/';

  for (const key of Object.keys(statics)) {
    const filePath = statics[key];
    if (typeof filePath !== 'string') continue;
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    let message = chalk.default(`- **${key}**: `) + chalk.blue(`\`${fileName}\``) + ' : ';
    if (filePath.includes(expectedLocation)) {
      message += chalk.bgGreen.black(`\`${filePath}\``);
    } else {
      message += chalk.bgRed.black(`\`${filePath}\``);
    }
    console.log(message);
  }

  logFooter();
}

function logEnvironment({ config, ...env } = {}) {
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

function logAutoConfigValues(env) {
  const locations = getPaths(env);

  const config = readConfigJson(env.projectRoot);

  const standardConfig = ensurePWAConfig({}, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
  const pwaConfig = ensurePWAConfig(config, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });

  const nonStandard = diff(standardConfig, pwaConfig);

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
}

async function reportAsync(webpackConfig, { config, ...env } = {}) {
  console.log(chalk.bold('\n\nStart Copy\n\n'));

  logWebpackConfigComponents(webpackConfig);
  logEnvironment(env);
  logStatics(env);
  logAutoConfigValues(env);

  const locations = getPaths(env);

  await testBabelPreset(locations);

  console.log(chalk.bold('\nEnd Copy\n\n'));
}

async function testBabelPreset(locations) {
  logHeader('Babel Preset');

  const babelrc = locations.absolute('.babelrc');
  const babelConfig = locations.absolute('babel.config.js');

  const printPassed = (message, ...messages) =>
    console.log(chalk.bgGreen.black(`- [✔︎ ${message}]`, ...messages));
  const printWarning = (message, ...messages) =>
    console.log(chalk.bgYellow.black(`- [${message}]`, ...messages));
  const printFailed = (message, ...messages) =>
    console.log(chalk.bgRed.black(`- [x ${message}]`, ...messages));

  if (fs.existsSync(babelrc)) {
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

  if (fs.existsSync(babelConfig)) {
    const configObjectOrFunction = require(require.resolve(babelConfig));

    if (isFunction(configObjectOrFunction)) {
      try {
        const results = await configObjectOrFunction({ cache() {} });
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
}

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

module.exports = {
  reportAsync,
};
