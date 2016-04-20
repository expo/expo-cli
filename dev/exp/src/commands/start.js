var crayon = require('@ccheever/crayon');
var path = require('path');
var pm2 = require('pm2');
var simpleSpinner = require('@exponent/simple-spinner');

import {
  PackagerController,
  RunPackager,
  UrlUtils,
  UserSettings,
} from 'xdl';

var askUser = require('../askUser');
var CommandError = require('../CommandError');
var config = require('../config');
var log = require('../log');
var pm2serve = require('../pm2serve');
var sendTo = require('../sendTo');
var urlOpts = require('../urlOpts');

async function action(projectDir, options) {
  await pm2serve.setupServeAsync(projectDir);

  // If run without --foreground, we spawn a new pm2 process that runs
  // the same command with --foreground added.
  if (!options.foreground) {
    await urlOpts.optsAsync(projectDir, options);

    var [pm2Name, pm2Id] = await Promise.all([
      pm2serve.pm2NameAsync(),
      config.projectExpJsonFile(projectDir).getAsync('pm2Id', null),
    ]);

    var script = process.argv[1];
    var args_ = process.argv.slice(2);
    args_.push('--foreground');

    // pm2 spits out some log statements here
    let tempLog = console.log;
    console.log = function () {};
    await pm2.promise.connect();
    console.log = tempLog;

    await config.projectExpJsonFile(projectDir).writeAsync({pm2Id, pm2Name, state: 'STARTING'});

    // There is a race condition here, but let's just not worry about it for now...
    var needToStart = true;
    if (pm2Id != null) {
      // If this is already being managed by pm2, then restart it
      var app = await pm2serve.getPm2AppByNameAsync(pm2Name);
      if (app) {
        log("pm2 managed process exists; restarting it");
        await pm2.promise.restart(app.pm_id);
        //var app_ = await getPm2AppByIdAsync(pm2Id);
        needToStart = false;
      } else {
        log("Can't find pm2 managed process", pm2Id, " so will start a new one");
        await config.projectExpJsonFile(projectDir).deleteKeyAsync('pm2Id');
      }
    }

    if (needToStart) {
      log("Starting exp-serve process under pm2");

      // If it's not being managed by pm2 then start it
      var _apps = await pm2.promise.start({
        name: pm2Name,
        script: script,
        args: args_,
        watch: false,
        cwd: process.cwd(),
        env: process.env,
      });
    }

    var app = await pm2serve.getPm2AppByNameAsync(pm2Name);
    if (app) {
      await config.projectExpJsonFile(projectDir).mergeAsync({pm2Name, pm2Id: app.pm_id});
    } else {
      throw CommandError('PM2_ERROR_STARTING_PROCESS', "Something went wrong starting exp serve:");
    }

    await pm2.promise.disconnect();

    var recipient = await sendTo.getRecipient(options.sendTo);

    log("Waiting for packager, etc. to start");
    simpleSpinner.start();
    let result = await pm2serve.waitForRunningAsync(config.projectExpJsonFile(projectDir));
    simpleSpinner.stop();
    if (!result) {
      log.error(`Error while starting. Please run "exp logs ${projectDir}" to view the errors.`);
      process.exit(1);
      return;
    }

    log("Exponent is ready.");

    let url = await UrlUtils.constructManifestUrlAsync(projectDir);
    log("Your URL is\n\n" + crayon.underline(url) + "\n");
    log.raw(url);

    if (recipient) {
      await sendTo.sendUrlAsync(url, recipient);
    }

    urlOpts.handleQROpt(url, options);
    await urlOpts.handleMobileOptsAsync(url, options);

    return config.projectExpJsonFile(projectDir).readAsync();
  }

  log(crayon.gray("Using project at", process.cwd()));

  let pc = await RunPackager.runAsync({
    root: path.resolve(process.cwd()),
  });

  pc.on('stdout', console.log);
  pc.on('stderr', console.log);

  try {
    await pc.startAsync();

    config.projectExpJsonFile(projectDir).mergeAsync({
      err: null,
      state: 'RUNNING',
    });
  } catch (e) {
    config.projectExpJsonFile(projectDir).mergeAsync({
      err: null,
      state: 'ERROR',
    });
  }

  process.on('exit', () => {
    PackagerController.exit();
  });

  process.on('SIGTERM', () => {
    PackagerController.exit();
  });

  return config.projectExpJsonFile(projectDir).readAsync();
}

module.exports = (program) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    //.help("Starts a local server to serve your app and gives you a URL to it.\n" +
    //"[project-dir] defaults to '.'");
    .urlOpts()
    .option('--foreground', 'Start in the foreground. Not recommended. Use "exp logs" instead')
    .asyncActionProjectDir(action);
};
