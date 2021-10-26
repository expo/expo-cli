import { PodfileTracer } from '@expo/xcpretty';
import chalk from 'chalk';

import Log from '../../../../log';
import { printTableJsonArray } from '../../../utils/cli-table';
import { resolveXcodeProject } from '../resolveOptionsAsync';
import {
  getDataForGroupedSubsections,
  getEarliestTimeRecursive,
  getSubsectionsGroupedByNodeModule,
  normalizePropsRecursive,
} from './ActivityLogSection';
import { ActivityLogSection } from './XCResult.types';

export function printAdvancedModuleSummary(projectRoot: string, data: ActivityLogSection) {
  const formatter = PodfileTracer.create(projectRoot, {
    xcodeProject: resolveXcodeProject(projectRoot),
  });

  const startOffset = getEarliestTimeRecursive(data, Number.MAX_SAFE_INTEGER);
  const normalizedData = normalizePropsRecursive(data, startOffset, formatter);
  // const output = pushSection(normalizePropsRecursive(data, startOffset, formatter), 0).flat();

  const nodeModuleGroups = getSubsectionsGroupedByNodeModule(normalizedData);
  const parsedGroups = getDataForGroupedSubsections(nodeModuleGroups);

  const parsed = Object.values(parsedGroups)
    .sort((a, b) => b.realDurationMilllis - a.realDurationMilllis)
    .map(group => {
      const isFramework = group.items.find(item => item.title.includes('Copy XCFrameworks'));
      const formatTitle = (title: string) => (isFramework ? chalk.bold(title) : title);
      return {
        Name: formatTitle(group.nodeModuleName),
        Compiling: `${toFixedSpecial(group.realDurationMilllis / 1000, 2)}s`,
        Absolute: `${toFixedSpecial(group.absolutePhysicalDuration / 1000, 2)}s`,
        Scripting: `${toFixedSpecial(
          Math.min(group.realDurationMilllis, group.transitiveScriptingTimeMillis) / 1000,
          2
        )}s`,
        Ops: group.items.length,
      };
    });

  if (parsed.length) {
    printDynamicTable(parsed);
  } else {
    Log.log(chalk.red('No data found'));
  }
}

export function printBasicSummary(data: ActivityLogSection) {
  printDynamicTable([
    {
      Name: data.title,
      Tasks: data.subsections.length,
      Seconds: toFixedSpecial(data.duration, 2),
    },
  ]);
}

function toFixedSpecial(value: number, precision: number): string {
  const fixed = value.toFixed(precision);
  if (precision > 0 && fixed.endsWith('0')) {
    if (value < 0.0001) {
      return '0';
    } else if (/^0\.0+$/.test(fixed)) {
      // Keep increasing percision until we get a non-zero value
      return toFixedSpecial(value, precision + 1);
    }
    return toFixedSpecial(value, precision - 1);
  }
  return fixed;
}

export function printBuildTimingSummaries(data: ActivityLogSection) {
  const timingSummaries = data.subsections.filter(
    section => section.domainType === 'com.apple.dt.IDE.BuildLogTimingSummarySection'
  );

  timingSummaries.forEach(section => {
    Log.log(section.title);
    const timing = section.subsections
      ?.map?.(section => {
        if (section.domainType === 'com.apple.dt.IDE.timing.aggregate') {
          // Log.log(section.commandDetails);
          const [, Name, Tasks, Seconds] =
            section.commandDetails?.match(/(\w+) \((\d+).*\) \| ([\d.]+) seconds/) || [];
          return { Name, Tasks, Seconds };
        }
        return null;
      })
      .filter(Boolean);
    if (timing) {
      printDynamicTable(timing);
    }
  });
}

function printDynamicTable(tableData: Record<string, any>[]) {
  const headers = Object.keys(tableData[0]); // ['Target', 'Duration', 'Files'];
  const lengths = headers.map(
    header =>
      Math.max(
        header.length,
        tableData.reduce((p, c) => Math.max(String(c[header]).length, p), 0)
      ) + 2
  );
  Log.log(printTableJsonArray(headers, tableData, lengths));

  // Log.log('Duration:', data.duration.toFixed(2), 'Operations:', data.subsections.length);
}
