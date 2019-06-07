const chalk = require('chalk');
const getenv = require('getenv');

const diff = require('deep-diff');
const { ensurePWAConfig, readConfigJson } = require('@expo/config');
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

// Only diagnose the project if EXPO_DEBUG=true is set. ex: EXPO_DEBUG=true expo start
function shouldDiagnose() {
  return getenv.boolish('EXPO_DEBUG', false);
}

function logTitle(title) {
  console.log(chalk.bgGreen.black(`[${title}]`));
}

// Log the main risky parts of webpack.config
function logWebpackConfigComponents(webpackConfig) {
  logTitle('Webpack Info');
  const {
    mode,
    resolve: { alias = {} } = {},
    entry,
    devtool,
    context,
    devServer: { https, hot, contentBase } = {},
  } = webpackConfig;
  // console.log('WEBPACK', JSON.stringify(webpackConfig, null, 2));
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
}

function logStatics(env = {}) {
  logTitle('Statics Info');

  const paths = getPaths(env);

  // Detect if the default template files aren't being used.
  const { template: statics = {} } = paths;

  const expectedLocation = 'webpack-config/web-default/';

  for (const key of Object.keys(statics)) {
    const filePath = statics[key];
    if (typeof filePath !== 'string') continue;
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    let message = chalk.default('- ' + key + ': ') + chalk.blue(fileName) + ' : ';
    if (filePath.includes(expectedLocation)) {
      message += chalk.bgGreen.black(filePath);
    } else {
      message += chalk.bgRed.black(filePath);
    }
    console.log(message);
  }
}

function logEnvironment({ config, ...env } = {}) {
  logTitle('Environment Info');
  console.log(colorizeKeys(env));
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

  logTitle('App.json');
  console.log(colorizeKeys(obj));
}

function report(webpackConfig, { config, ...env } = {}) {
  if (!shouldDiagnose()) {
    return;
  }

  logWebpackConfigComponents(webpackConfig);
  logEnvironment(env);
  logStatics(env);
  logAutoConfigValues(env);
}

module.exports = {
  shouldDiagnose,
  report,
};
