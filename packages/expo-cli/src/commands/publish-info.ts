import dateFormat from 'dateformat';

import * as table from './utils/cli-table';
import {
  DetailOptions,
  HistoryOptions,
  Publication,
  getPublicationDetailAsync,
  getPublishHistoryAsync,
  printPublicationDetailAsync,
} from './utils/PublishUtils';

const HORIZ_CELL_WIDTH_SMALL = 15;
const HORIZ_CELL_WIDTH_BIG = 40;

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
    .option(
      '-p, --platform <ios|android>',
      'Filter by platform, android or ios. Defaults to both platforms.'
    )
    .option('-s, --sdk-version <version>', 'Filter by SDK version e.g. 35.0.0')
    .option('-r, --raw', 'Produce some raw output.')
    .asyncActionProjectDir(
      async (projectDir: string, options: HistoryOptions) => {
        const result = await getPublishHistoryAsync(projectDir, options);

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
            'publicationId',
          ];

          // colWidths contains the cell size of each header
          let colWidths: number[] = [];
          let bigCells = new Set(['publicationId', 'publishedTime']);
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
          let tableString = table.printTableJsonArray(headers, resultRows, colWidths);
          console.log(tableString);
        } else {
          throw new Error('No records found matching your query.');
        }
      },
      { checkConfig: true }
    );
  program
    .command('publish:details [project-dir]')
    .alias('pd')
    .description('View the details of a published release.')
    .option('--publish-id <publish-id>', 'Publication id. (Required)')
    .option('-r, --raw', 'Produce some raw output.')
    .asyncActionProjectDir(
      async (projectDir: string, options: DetailOptions) => {
        if (!options.publishId) {
          throw new Error('--publish-id must be specified.');
        }

        const detail = await getPublicationDetailAsync(projectDir, options);
        await printPublicationDetailAsync(detail, options);
      },
      { checkConfig: true }
    );
};
