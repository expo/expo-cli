#!/usr/bin/env node

var _ = require('lodash-node');
var Command = require('commander').Command;
var crayon = require('@ccheever/crayon');
var glob = require('glob');
var instapromise = require('instapromise');
var program = require('commander');
var url = require('url');

import {
  Config,
} from 'xdl';

var log = require('./log');
var update = require('./update');
var urlOpts = require('./urlOpts');

Command.prototype.urlOpts = function() {
  urlOpts.addOptions(this);
  return this;
};

Command.prototype.addUrlOption = function() {
  urlOpts.addUrlOption(this);
  return this;
};

Command.prototype.asyncAction = function(asyncFn) {
  return this.action(async (...args) => {
    try {
      let options = _.last(args).parent;
      if (options.output === 'raw') {
        log.config.raw = true;
        process.env['PM2_SILENT'] = true;
      }
      await asyncFn(...args);
    } catch (err) {
      if (err._isCommandError) {
        log.error(err.message);
      } else if (err._isApiError) {
        log.error(crayon.red(err.message));
      } else {
        log.error(err.message);
        crayon.gray.error(err.stack);
      }
    }
  });
};

Command.prototype.asyncActionProjectDir = function(asyncFn) {
  return this.asyncAction(async (projectDir, ...args) => {
    if (!projectDir) {
      projectDir = process.cwd();
    }

    return asyncFn(projectDir, ...args);
  });
};

async function runAsync() {
  try {
    if (process.env.SERVER_URL) {
      let serverUrl = process.env.SERVER_URL;
      if (!serverUrl.startsWith('http')) {
        serverUrl = 'http://' + serverUrl;
      }
      let parsedUrl = url.parse(serverUrl);
      Config.api.host = parsedUrl.hostname;
      Config.api.port = parsedUrl.port;
    }

    Config.developerTool = 'exp';

    program.name = 'exp';
    program
      .version(require('../package.json').version)
      .option('-o, --output [format]', 'Output format. pretty (default), raw');
    glob.sync('commands/*.js', {
      cwd: __dirname,
    }).forEach(file => {
      require('./' + file)(program);
    });

    if (process.env.EXPONENT_DEBUG) {
      glob.sync('debug_commands/*.js', {
        cwd: __dirname,
      }).forEach(file => {
        require('./' + file)(program);
      });
    }

    program.parse(process.argv);

    let subCommand = process.argv[2];
    if (subCommand) {
      let commands = [];
      program.commands.forEach(command => {
        commands.push(command['_name']);
        let alias = command['_alias'];
        if (alias) {
          commands.push(alias);
        }
      });
      if (!_.includes(commands, subCommand)) {
        console.log(`"${subCommand}" is not an exp command. See "exp --help" for the full list of commands.`);
      }
    } else {
      program.help();
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function checkForUpdateAsync() {
  let checkForUpdate = await update.checkForExpUpdateAsync();
  switch (checkForUpdate.state) {
    case 'up-to-date':
      break;
    case 'out-of-date':
      crayon.green.error(checkForUpdate.message);
      break;
    case 'ahead-of-published':
      crayon.cyan.error(checkForUpdate.message);
      break;
    case 'deprecated':
      crayon.yellow.bold.error(checkForUpdate.message);
      break;
    default:
      log.error("Confused about what version of exp you have?");
  }
}

if (require.main === module) {
  Promise.all([
    runAsync(),
    checkForUpdateAsync(),
  ]);
}
