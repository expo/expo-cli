import assert from 'assert';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';

import Log from '../../../log';
import { selectAsync } from '../../../prompts';
import { toChromeTraceAsync } from './xcresult/ChromeTrace';
import * as XCResultTool from './xcresult/XCResultTool';
import { printAdvancedModuleSummary, printBuildTimingSummaries } from './xcresult/printSummaries';

const isMac = process.platform === 'darwin';

type Options = {
  path: string;
};

async function getPreviousTraceDirectoriesAsync(projectRoot: string): Promise<string[]> {
  const tempFolder = path.dirname(XCResultTool.getTempDirectory(projectRoot, 'foo'));
  const traceDirectories = await fs.readdir(tempFolder);

  const traceDirectoryPaths = traceDirectories.map(traceDirectory =>
    path.join(tempFolder, traceDirectory)
  );

  const traceDirectoryPathsWithTimestamps = (
    await Promise.all(
      traceDirectoryPaths.map(async traceDirectoryPath => {
        const hasFile = await fs.pathExists(path.join(traceDirectoryPath, 'ResultBundle.xcresult'));
        if (!hasFile) {
          return null;
        }
        const timestamp = await fs.stat(traceDirectoryPath).then(stat => stat.mtime.getTime());

        return {
          path: traceDirectoryPath,
          timestamp,
        };
      })
    )
  ).filter(Boolean);
  const traceDirectoryPathsWithTimestampsSorted = traceDirectoryPathsWithTimestamps.sort(
    (a, b) => b!.timestamp - a!.timestamp
  );

  return traceDirectoryPathsWithTimestampsSorted.map(
    traceDirectoryPathWithTimestamp => traceDirectoryPathWithTimestamp!.path
  );
}

async function resolveOptionsAsync(
  projectRoot: string,
  options: Partial<Options>
): Promise<Options> {
  if (!options.path) {
    const validFolders = await getPreviousTraceDirectoriesAsync(projectRoot);
    assert(
      validFolders.length > 0,
      `No valid trace directories found in ${projectRoot}. Please supply one with --path`
    );

    const selected = await selectAsync({
      message: 'Choose a SDK version to upgrade to:',
      limit: 20,
      choices: validFolders.map(dir => ({
        value: dir,
        title: chalk.bold(path.relative(projectRoot, dir)),
      })),
    });

    assert(selected, '--path is required');

    options.path = path.join(selected, 'ResultBundle.xcresult');
  }
  return options as Options;
}

export async function actionAsync(projectRoot: string, options: Partial<Options>) {
  assert(isMac, 'xcrun is a required to run this command');
  const resolvedOptions = await resolveOptionsAsync(projectRoot, options);

  const actionsInvocationRecord = await XCResultTool.parseXCResultFileAsync(resolvedOptions.path);
  const activityLogSection = await XCResultTool.getActivityLogSectionAsync(
    resolvedOptions.path,
    actionsInvocationRecord
  );

  assert(activityLogSection, 'Could not find activity log section');

  printBuildTimingSummaries(activityLogSection);

  printAdvancedModuleSummary(projectRoot, activityLogSection);

  const json = await toChromeTraceAsync(activityLogSection);

  assert(json.length, 'Could not convert to Chrome Trace');

  const output = path.join(path.dirname(resolvedOptions.path), 'trace.json');
  await fs.promises.writeFile(output, JSON.stringify(json, null, 2), 'utf8');

  Log.log('Wrote chrome trace to: ' + output);
}
