import {
  Project,
  ProjectUtils,
  UrlUtils,
} from 'xdl';

import bunyan from 'bunyan';
import crayon from '@ccheever/crayon';
import simpleSpinner from '@exponent/simple-spinner';
import path from 'path';
import pm2 from 'pm2';

import CommandError from '../CommandError';
import config from '../config';
import log from '../log';
import pm2serve from '../pm2serve';
import sendTo from '../sendTo';
import urlOpts from '../urlOpts';

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
    console.log = function() {};
    await pm2.promise.connect();
    console.log = tempLog;

    await config.projectExpJsonFile(projectDir).writeAsync({pm2Id, pm2Name, state: 'STARTING'});

    // There is a race condition here, but let's just not worry about it for now...
    if (pm2Id !== null) {
      // If this is already being managed by pm2, then restart it
      var app = await pm2serve.getPm2AppByNameAsync(pm2Name);
      if (app) {
        log("pm2 managed process exists");
        await pm2.promise.stop(app.pm_id);
        await pm2.promise.delete(app.pm_id);
      } else {
        log("Can't find pm2 managed process", pm2Id, " so will start a new one");
        await config.projectExpJsonFile(projectDir).deleteKeyAsync('pm2Id');
      }
    }

    log("Starting exp-serve process under pm2");

    await pm2.promise.start({
      name: pm2Name,
      script,
      args: args_,
      autorestart: false,
      watch: false,
      cwd: process.cwd(),
      env: process.env,
    });

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
    await urlOpts.handleMobileOptsAsync(projectDir, url, options);

    return config.projectExpJsonFile(projectDir).readAsync();
  }

  log(crayon.gray("Using project at", process.cwd()));

  let root = path.resolve(process.cwd());
  let startOpts = {};
  if (options.clear) {
    startOpts.reset = true;
  }

  try {
    ProjectUtils.attachLoggerStream(root, {
      stream: {
        write: (chunk) => {
          if (chunk.level <= bunyan.INFO) {
            console.log(chunk.msg);
          } else if (chunk.level === bunyan.WARN) {
            console.warn(chunk.msg);
          } else {
            console.error(chunk.msg);
          }
        },
      },
      type: 'raw',
    });
    await Project.startAsync(root, startOpts);

    await config.projectExpJsonFile(projectDir).mergeAsync({
      err: null,
      state: 'RUNNING',
    });
  } catch (e) {
    await config.projectExpJsonFile(projectDir).mergeAsync({
      err: null,
      state: 'ERROR',
    });

    throw e;
  }

  return config.projectExpJsonFile(projectDir).readAsync();
}

export default (program) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    //.help("Starts a local server to serve your app and gives you a URL to it.\n" +
    //"[project-dir] defaults to '.'");
    .urlOpts()
    .option('--foreground', 'Start in the foreground. Not recommended. Use "exp logs" instead')
    .asyncActionProjectDir(action);
};
