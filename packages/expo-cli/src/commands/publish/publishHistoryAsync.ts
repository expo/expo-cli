import dateFormat from 'dateformat';

import Log from '../../log';
import { getPublishHistoryAsync, HistoryOptions, Publication } from '../utils/PublishUtils';
import * as table from '../utils/cli-table';

const HORIZ_CELL_WIDTH_SMALL = 15;
const HORIZ_CELL_WIDTH_BIG = 40;

export async function actionAsync(projectRoot: string, options: HistoryOptions) {
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
}
