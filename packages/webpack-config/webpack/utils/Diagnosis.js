const chalk = require('chalk');
const getenv = require('getenv');

//https://stackoverflow.com/a/51319962/4047926
function colorizeKeys(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function(match) {
      let cls = '\x1b[36m';
      if (/--pop/.test(match)) {
        return chalk.red.bold(match.substring(0, match.length - 7) + '":'); // '\x1b[30m' + '+' + match.substring(0, match.length - 7) + '": ' + '\x1b[0m';
      } else if (/--push/.test(match)) {
        return chalk.green.bold(match.substring(0, match.length - 8) + '":'); // '\x1b[30m' + '+' + match.substring(0, match.length - 7) + '": ' + '\x1b[0m';
      } else if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // cls = '\x1b[34m';
          return chalk.magenta(match);
        } else {
          return chalk.blueBright(match);
          // cls = '\x1b[32m';
        }
      } else if (/true|false/.test(match)) {
        return chalk.magenta();
      } else if (/null/.test(match)) {
        cls = '\x1b[31m';
      }
      return cls + match + '\x1b[0m';
    }
  );
}

function log(report) {
  console.log(chalk.green('Report'));
  console.log(colorizeKeys(report));
}

function shouldDiagnose() {
  return getenv.boolish('EXPO_DEBUG', false);
}

function report(webpackConfig, { config, ...env } = {}) {
  if (!shouldDiagnose()) {
    return;
  }
  const paths = getPaths(env);

  const {
    mode,
    resolve: { alias = {} } = {},
    entry,
    devtool,
    context,
    devServer: { https, hot, contentBase } = {},
  } = webpackConfig;
  console.log('WEBPACK', JSON.stringify(webpackConfig, null, 2));

  log({
    mode,
    devtool,
    entry,
    context,
    https,
    hot,
    contentBase,
    alias,
    paths,
    config,
    env,
  });

  console.log(chalk.bold('\nStatics'));

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
  console.log('\n');

  logAutoConfigValues(env);
}

module.exports = {
  log,
  shouldDiagnose,
  report,
};

const diff = require('deep-diff');
const { ensurePWAConfig, readConfigJson } = require('@expo/config');
const getPaths = require('./getPaths');
const getConfig = require('../utils/getConfig');
const getPaths = require('./getPaths');

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

  console.log('NONNON', nonStandard);
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

  let obj = {};
  for (const diff of nonStandard) {
    // console.log(
    //   chalk.bold(diff.path.join('/') + ': ') + chalk.bgRed(JSON.stringify(diff.rhs, null, 2))
    // );
    if (diff.kind !== 'A') {
      setDeepValue(diff.path, obj, diff);
    }
  }

  console.log(chalk.bold('Internal Config:\n'));
  console.log(colorizeKeys(obj));
}
