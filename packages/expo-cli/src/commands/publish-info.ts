import dateFormat from 'dateformat';

import Log from '../log';
import {
  DetailOptions,
  getPublicationDetailAsync,
  getPublishHistoryAsync,
  HistoryOptions,
  printPublicationDetailAsync,
  Publication,
} from './utils/PublishUtils';
import * as table from './utils/cli-table';

const HORIZ_CELL_WIDTH_SMALL = 15;
const HORIZ_CELL_WIDTH_BIG = 40;

export default (program: any) => {
  program
    .command('publish:history [path]')
    .alias('ph')
    .description("Log the project's releases")
    .helpGroup('publish')
    .option(
      '-c, --release-channel <channel-name>',
      'Filter by release channel. If this flag is not included, the most recent publications will be shown.'
    )
    .option('--count <number-of-logs>', 'Number of logs to view, maximum 100, default 5.', parseInt)
    .option(
      '-p, --platform <ios|android>',
      'Filter by platform, android or ios. Defaults to both platforms.'
    )
    .option('-s, --sdk-version <version>', 'Filter by SDK version e.g. 35.0.0')
    .option('-r, --raw', 'Produce some raw output.')
    .asyncActionProjectDir(
      async (projectRoot: string, options: HistoryOptions) => {
        const result = await getPublishHistoryAsync(projectRoot, options);

        if (options.raw) {
          Log.log(JSON.stringify(result));
          return;
        }

        if (result.queryResult && result.queryResult.length > 0) {
          // Print general publication info
          const sampleItem = result.queryResult[0]; // get a sample item
          const generalTableString = table.printTableJson(
            {
              fullName: sampleItem.fullName,
            },
            'General Info'
          );
          Log.log(generalTableString);

          // Print info specific to each publication
          const headers = [
            'publishedTime',
            'appVersion',
            'sdkVersion',
            'platform',
            'channel',
            'publicationId',
          ];

          // colWidths contains the cell size of each header
          const colWidths: number[] = [];
          const bigCells = new Set(['publicationId', 'publishedTime', 'channel']);
          headers.forEach(header => {
            if (bigCells.has(header)) {
              colWidths.push(HORIZ_CELL_WIDTH_BIG);
            } else {
              colWidths.push(HORIZ_CELL_WIDTH_SMALL);
            }
          });
          const resultRows: Publication[] = result.queryResult.map((publication: Publication) => ({
            ...publication,
            publishedTime: dateFormat(publication.publishedTime, 'ddd mmm dd yyyy HH:MM:ss Z'),
          }));
          const tableString = table.printTableJsonArray(headers, resultRows, colWidths);
          Log.log(tableString);
        } else {
          throw new Error('No records found matching your query.');
        }
      },
      { checkConfig: true }
    );
  program
    .command('publish:details [path]')
    .alias('pd')
    .description('Log details of a published release')
    .helpGroup('publish')
    .option('--publish-id <publish-id>', 'Publication id. (Required)')
    .option('-r, --raw', 'Produce some raw output.')
    .asyncActionProjectDir(
      async (projectRoot: string, options: DetailOptions) => {
        if (!options.publishId) {
          throw new Error('--publish-id must be specified.');
        }

        const detail = await getPublicationDetailAsync(projectRoot, options);
        await printPublicationDetailAsync(detail, options);
      },
      { checkConfig: true }
    );
};
