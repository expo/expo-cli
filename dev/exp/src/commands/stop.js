import pm2 from 'pm2';

import config from '../config';
import log from '../log';
import pm2serve from '../pm2serve';

async function action(projectDir, options) {
  if (options.all) {
    log("Stopping all servers...");
    await pm2.promise.connect();
    await pm2.promise.kill();
    log("Stopped.");

    // TODO: figure out why it's not exiting on it's own
    process.exit();
  } else {
    await pm2serve.setupServeAsync(projectDir);

    await pm2.promise.connect();
    try {
      log("Stopping the server...");
      let name = await pm2serve.pm2NameAsync();
      await pm2.promise.delete(name);
    } catch (e) {
      log.error("Failed to stop the server\n" + e.message);
      process.exit(1);
      return;
    }
    await pm2.promise.disconnect();
    await config.projectExpJsonFile(projectDir).mergeAsync({state: 'STOPPED'});
    log("Stopped.");
  }
}

export default (program) => {
  program
    .command('stop [project-dir]')
    .alias('q')
    .description('Stops the server')
    .option('-a, --all', 'Stop all processes')
    .asyncActionProjectDir(action);
};
