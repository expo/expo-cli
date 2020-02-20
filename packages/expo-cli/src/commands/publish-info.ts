import { getConfig } from '@expo/config';
import { Api, ApiV2, FormData, Project, UserManager } from '@expo/xdl';
import dateFormat from 'dateformat';

import * as table from './utils/cli-table';

const HORIZ_CELL_WIDTH_SMALL = 15;
const HORIZ_CELL_WIDTH_BIG = 40;
const VERSION = 2;

type HistoryOptions = {
  releaseChannel?: string;
  count?: number;
  platform?: 'android' | 'ios';
  raw?: boolean;
};

type DetailOptions = {
  publishId?: string;
  raw?: boolean;
};

type Publication = {
  fullName: string;
  channel: string;
  channelId: string;
  publicationId: string;
  appVersion: string;
  sdkVersion: string;
  publishedTime: string;
  platform: 'android' | 'ios';
};

export default (program: any) => {
  program
    .command('publish:history [project-dir]')
    .alias('ph')
    .description('View a log of your published releases.')
    .option(
      '-c, --release-channel <channel-name>',
      'Filter by release channel. If this flag is not included, the most recent publications will be shown.'
    )
    .option(
      '-count, --count <number-of-logs>',
      'Number of logs to view, maximum 100, default 5.',
      parseInt
    )
    .option('-p, --platform <ios|android>', 'Filter by platform, android or ios.')
    .option('-r, --raw', 'Produce some raw output.')
    .asyncActionProjectDir(async (projectDir: string, options: HistoryOptions) => {
      if (options.count && (isNaN(options.count) || options.count < 1 || options.count > 100)) {
        throw new Error('-n must be a number between 1 and 100 inclusive');
      }

      // TODO(ville): handle the API result for not authenticated user instead of checking upfront
      const user = await UserManager.ensureLoggedInAsync();
      const { exp } = getConfig(projectDir, {
        skipSDKVersionRequirement: true,
        mode: 'development',
      });

      let result: any;
      if (process.env.EXPO_LEGACY_API === 'true') {
        // TODO(ville): move request from multipart/form-data to JSON once supported by the endpoint.
        let formData = new FormData();
        formData.append('queryType', 'history');
        if (exp.owner) {
          formData.append('owner', exp.owner);
        }
        formData.append('slug', await Project.getSlugAsync(projectDir, options));
        formData.append('version', VERSION);
        if (options.releaseChannel) {
          formData.append('releaseChannel', options.releaseChannel);
        }
        if (options.count) {
          formData.append('count', options.count);
        }
        if (options.platform) {
          formData.append('platform', options.platform);
        }

        result = await Api.callMethodAsync('publishInfo', [], 'post', null, {
          formData,
        });
      } else {
        const api = ApiV2.clientForUser(user);
        result = await api.postAsync('publish/history', {
          owner: exp.owner,
          slug: await Project.getSlugAsync(projectDir, options),
          version: VERSION,
          releaseChannel: options.releaseChannel,
          count: options.count,
          platform: options.platform,
        });
      }

      if (options.raw) {
        console.log(JSON.stringify(result));
        return;
      }

      if (result.queryResult && result.queryResult.length > 0) {
        // Print general publication info
        let sampleItem = result.queryResult[0]; // get a sample item
        let generalTableString = table.printTableJson(
          {
            fullName: sampleItem.fullName,
          },
          'General Info'
        );
        console.log(generalTableString);

        // Print info specific to each publication
        let headers = [
          'publishedTime',
          'appVersion',
          'sdkVersion',
          'platform',
          'channel',
          'channelId',
          'publicationId',
        ];

        // colWidths contains the cell size of each header
        let colWidths: number[] = [];
        let bigCells = new Set(['publicationId', 'channelId', 'publishedTime']);
        headers.forEach(header => {
          if (bigCells.has(header)) {
            colWidths.push(HORIZ_CELL_WIDTH_BIG);
          } else {
            colWidths.push(HORIZ_CELL_WIDTH_SMALL);
          }
        });
        const resultRows = result.queryResult.map((publication: Publication) => ({
          ...publication,
          publishedTime: dateFormat(publication.publishedTime, 'ddd mmm dd yyyy HH:MM:ss Z'),
        }));
        let tableString = table.printTableJsonArray(headers, resultRows, colWidths);
        console.log(tableString);
      } else {
        throw new Error('No records found matching your query.');
      }
    });
  program
    .command('publish:details [project-dir]')
    .alias('pd')
    .description('View the details of a published release.')
    .option('--publish-id <publish-id>', 'Publication id. (Required)')
    .option('-r, --raw', 'Produce some raw output.')
    .asyncActionProjectDir(async (projectDir: string, options: DetailOptions) => {
      if (!options.publishId) {
        throw new Error('--publish-id must be specified.');
      }

      // TODO(ville): handle the API result for not authenticated user instead of checking upfront
      const user = await UserManager.ensureLoggedInAsync();
      const { exp } = getConfig(projectDir, {
        skipSDKVersionRequirement: true,
        mode: 'development',
      });
      const slug = await Project.getSlugAsync(projectDir, options);

      let result: any;
      if (process.env.EXPO_LEGACY_API === 'true') {
        let formData = new FormData();
        formData.append('queryType', 'details');

        if (exp.owner) {
          formData.append('owner', exp.owner);
        }
        formData.append('publishId', options.publishId);
        formData.append('slug', slug);

        result = await Api.callMethodAsync('publishInfo', null, 'post', null, {
          formData,
        });
      } else {
        const api = ApiV2.clientForUser(user);
        result = await api.postAsync('publish/details', {
          owner: exp.owner,
          publishId: options.publishId,
          slug,
        });
      }

      if (options.raw) {
        console.log(JSON.stringify(result));
        return;
      }

      if (result.queryResult) {
        let queryResult = result.queryResult;
        let manifest = queryResult.manifest;
        delete queryResult.manifest;

        // Print general release info
        let generalTableString = table.printTableJson(queryResult, 'Release Description');
        console.log(generalTableString);

        // Print manifest info
        let manifestTableString = table.printTableJson(manifest, 'Manifest Details');
        console.log(manifestTableString);
      } else {
        throw new Error('No records found matching your query.');
      }
    });
};
