import { Publish } from '@expo/api';
import dateFormat from 'dateformat';

import CommandError from '../../CommandError';
import Log from '../../log';
import { getPublishHistoryAsync } from '../utils/PublishUtils';
import * as table from '../utils/cli-table';

const HORIZ_CELL_WIDTH_SMALL = 15;
const HORIZ_CELL_WIDTH_MEDIUM = 20;
const HORIZ_CELL_WIDTH_BIG = 40;

export async function actionAsync(projectRoot: string, options: Publish.HistoryOptions) {
  const result = await getPublishHistoryAsync(projectRoot, options);

  if (options.raw) {
    Log.log(JSON.stringify(result));
    return;
  }

  if (result.length > 0) {
    // Print general publication info
    const sampleItem = result[0]; // get a sample item
    const generalTableString = table.printTableJson(
      {
        fullName: sampleItem.fullName,
      },
      'General Info'
    );
    Log.log(generalTableString);

    const hasRuntimeVersion = result.some(
      (publication: Publish.Publication) => !!publication.runtimeVersion
    );
    const hasSdkVersion = result.some(
      (publication: Publish.Publication) => !!publication.sdkVersion
    );

    // Print info specific to each publication
    const headers = [
      'publishedTime',
      'appVersion',
      ...(hasSdkVersion ? ['sdkVersion'] : []),
      ...(hasRuntimeVersion ? ['runtimeVersion'] : []),
      'platform',
      'channel',
      'publicationId',
    ];

    // colWidths contains the cell size of each header
    const colWidths: number[] = [];
    const bigCells = new Set(['publicationId', 'publishedTime', 'channel']);
    const mediumCells = new Set(['runtimeVersion']);
    headers.forEach(header => {
      if (bigCells.has(header)) {
        colWidths.push(HORIZ_CELL_WIDTH_BIG);
      } else if (mediumCells.has(header)) {
        colWidths.push(HORIZ_CELL_WIDTH_MEDIUM);
      } else {
        colWidths.push(HORIZ_CELL_WIDTH_SMALL);
      }
    });
    const resultRows: Publish.Publication[] = result.map((publication: Publish.Publication) => ({
      ...publication,
      publishedTime: dateFormat(publication.publishedTime, 'ddd mmm dd yyyy HH:MM:ss Z'),
    }));
    const tableString = table.printTableJsonArray(headers, resultRows, colWidths);
    Log.log(tableString);
  } else {
    throw new CommandError('No records found matching your query.');
  }
}
