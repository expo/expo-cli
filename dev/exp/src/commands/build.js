import {
  Project,
} from 'xdl';

import log from '../log';

import { action as publishAction } from './publish';

async function createAction(projectDir, options) {
  if (options.platform !== 'ios' &&
      options.platform !== 'android' &&
      options.platform !== 'all') {
      log.error('Invalid platform specified');
      process.exit(1);
  }
  const inProgress = await statusAction(projectDir, {
    ...options,
    current: true,
  });
  if (inProgress) {
    return;
  }

  log('Starting build process...');

  //run publish -- in future, we should determine whether we NEED to do this
  const { ids: expIds, url, err } = await publishAction(projectDir, {
    quiet: true, // no need to publish to slack
  });

  if (err) {
    log.error('Publishing failed with error:');
    log.error(err);
    process.exit(1);
  } else if (!url || url === '') {
    log.error('No url was returned from publish. Please try again.');
    process.exit(1);
  }

  log('Building...');

  let opts = {
    mode: 'create',
    quiet: !!options.quiet,
    expIds,
    platform: options.platform,
  };

  // call out to build api here with url
  const buildResp = await Project.buildAsync(projectDir, opts);

  if (options.wait) {
    const { ipaUrl, apkUrl, buildErr } = buildResp;
    // do some stuff here
    if (buildErr) {
      log.error('Build failed with error:');
      log.error(buildErr);
      process.exit(1);
    } else if (!ipaUrl || ipaUrl === '' || !apkUrl || apkUrl === '') {
      log.error('No url was returned from the build process. Please try again.');
      process.exit(1);
    }

    log(`IPA Url: ${ipaUrl}`);
    log(`APK Url: ${apkUrl}`);

    log('Successfully built standalone app!');
  } else {
    log('Build successfully started. Run "exp build" again to see status.');
  }
}

async function statusAction(projectDir, options) {
  log('Checking if current build exists...\n');

  const buildStatus = await Project.buildAsync(projectDir, {
    mode: 'status',
    current: !!options.current,
  });

  if (buildStatus.err) {
    throw new Error('Error getting current build status for this project.');
  }

  if (buildStatus.jobs && buildStatus.jobs.length) {
    log.raw();
    log('============');
    log('Build Status');
    log('============\n');
    buildStatus.jobs.forEach(j => {
      let platform;
      if (j.platform === 'ios') {
        platform = 'iOS';
      } else {
        platform = 'Android';
      }

      let status;
      switch (j.status) {
        case 'pending': status = 'Build waiting in queue...'; break;
        case 'started': status = 'Build started...'; break;
        case 'in-progress': status = 'Build in progress...'; break;
        case 'finished': status = 'Build finished.'; break;
        case 'errored': status = 'There was an error with this build. Please try again.'; break;
      }

      if (j.status !== 'finished') {
        log(`${platform}: ${status}`);
      } else {
        log(`${platform}:`);
        switch (j.platform) {
          case 'ios':
            if (!j.artifacts) {
              log(`Problem getting IPA URL. Please try build again.`);
              break;
            }
            log(`IPA: ${j.artifacts.url}\n`);
            break;
          case 'android':
            if (!j.artifacts) {
              log(`Problem getting APK URL. Please try build again.`);
              break;
            }
            log(`APK: ${j.artifacts.url}\n`);
            break;
        }
      }
    });
    return true;
  }

  log('No currently active or previous builds for this project.');

  return false;
}

let command;

if (process.env.TURTLE_POWER) {
  command = (program) => {
    program
      .command('build:create [project-dir]')
      .alias('bc')
      .description('Builds a standalone app for your project.')
      .option('-q, --quiet', "Don't send a link to our Slack")
      .option('-w, --wait', "Wait for build process to complete before exiting command (could be 5-30 min).")
      .option('-p, --platform [platform]', "Platform to build for. Accepted options are 'ios', 'android', 'all'", 'all')
      //.help('You must have the server running for this command to work')
      .asyncActionProjectDir(createAction);

    program
      .command('build:status [project-dir]')
      .alias('bs')
      .description(`Get's the status of a current (or most recently finished) build for your project.`)
      //.help('You must have the server running for this command to work')
      .asyncActionProjectDir(statusAction);
  };
} else {
  command = () => ({});
}

export default command;
