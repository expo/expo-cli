/**
 * @flow
 */

import { Api, Project, FormData } from 'xdl';
import log from '../log';

export default (program: any) => {
  program
    .command('publish:history [project-dir]')
    .alias('ph')
    .description('View a log of your published releases.')
    .option('-c, --release-channel [channel-name]', 'Filter by release channel')
    .option(
      '-count, --count [number-of-logs]',
      'Number of logs to view, maximum 100, default 5.',
      parseInt
    )
    .option('-p, --platform [ios|android]', 'Filter by platform, android or ios.')
    .allowNonInteractive()
    .asyncActionProjectDir(async (projectDir, options) => {
      if (options.count && (isNaN(options.count) || options.count < 1 || options.count > 100)) {
        log.error('-n must be a number between 1 and 100 inclusive');
        process.exit(1);
      }

      let formData = new FormData();
      formData.append('queryType', 'history');
      formData.append('slug', await Project.getSlugAsync(projectDir, options));
      if (options.releaseChannel) {
        formData.append('releaseChannel', options.releaseChannel);
      }
      if (options.count) {
        formData.append('count', options.count);
      }
      if (options.platform) {
        formData.append('platform', options.platform);
      }

      let result = await Api.callMethodAsync('publishInfo', null, 'post', null, {
        formData,
      });
      // TODO: pretty print this
      console.log(result.queryResult);
    });
  program
    .command('publish:details [project-dir]')
    .alias('pd')
    .description('View the details of a published release.')
    .option('--publish-id [publish-id]', 'Publication id.')
    .allowNonInteractive()
    .asyncActionProjectDir(async (projectDir, options) => {
      if (!options.publishId) {
        log.error('publishId must be specified.');
        process.exit(1);
      }

      let formData = new FormData();
      formData.append('queryType', 'details');
      formData.append('publishId', options.publishId);
      formData.append('slug', await Project.getSlugAsync(projectDir, options));

      let result = await Api.callMethodAsync('publishInfo', null, 'post', null, {
        formData,
      });
      // TODO: pretty print this
      console.log(result.queryResult);
    });
};
