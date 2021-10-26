import assert from 'assert';
import fs from 'fs-extra';
import * as path from 'path';

import Log from '../../../log';
import { toChromeTraceAsync } from './xcresult/ChromeTrace';
import * as XCResultTool from './xcresult/XCResultTool';
import { printAdvancedModuleSummary, printBuildTimingSummaries } from './xcresult/printSummaries';

const isMac = process.platform === 'darwin';

export async function actionAsync(projectRoot: string, options: { path?: string }) {
  assert(isMac, 'xcrun is a required to run this command');
  assert(options.path, '--path is required');

  const actionsInvocationRecord = await XCResultTool.parseXCResultFileAsync(options.path);
  const activityLogSection = await XCResultTool.getActivityLogSectionAsync(
    options.path,
    actionsInvocationRecord
  );

  if (activityLogSection) {
    printBuildTimingSummaries(activityLogSection);

    printAdvancedModuleSummary(projectRoot, activityLogSection);

    const json = await toChromeTraceAsync(activityLogSection);
    if (json.length) {
      const output = path.join(path.dirname(options.path), 'trace.json');
      await fs.promises.writeFile(output, JSON.stringify(json, null, 2), 'utf8');

      Log.log('Wrote chrome trace to: ' + output);
    } else {
      Log.log('No chrome trace data found');
    }
  }
}
