import { PodfileTracer } from '@expo/xcpretty';
import fs from 'fs';
import * as path from 'path';

import { resolveXcodeProject } from '../resolveOptionsAsync';
import { ActivityLogCommandInvocationSection, ActivityLogSection } from './XCResult.types';
import { getTempDirectory } from './XCResultTool';

/// https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU
enum TrackPhase {
  thread = 'M',
  durationStart = 'B',
  durationEnd = 'E',
  complete = 'X',
  instant = 'I',
}

function getEarliestTimeRecursive(section: ActivityLogSection, offset: number): number {
  if (section.startTime.getTime() < offset) {
    offset = section.startTime.getTime();
  }
  if (section.subsections) {
    for (const v of section.subsections) {
      offset = getEarliestTimeRecursive(v, offset);
    }
  }
  return offset;
}

function isActivityLogCommandInvocationSection(
  obj: any
): obj is ActivityLogCommandInvocationSection {
  return 'commandDetails' in obj;
}

function normalizePropsRecursive(
  section: ActivityLogSection,
  offset: number,
  formatter: PodfileTracer
): ActivityLogSection {
  if (isActivityLogCommandInvocationSection(section)) {
    const matches = section.commandDetails?.match(
      /\s?[^(]+(?:\(in\s.*target '([^']*)'.*project '([^']*)'\)$)?/m
    );
    const target = matches?.[1];
    section.nativeTargetName = target;

    if (target) {
      // console.log('get:', target, formatter.getNodeModuleNameForTarget(target)?.name);
      section.nodeModuleName = formatter.getNodeModuleNameForTarget(target)?.name;
    }
  }
  section.normalizedStartTime = section.startTime.getTime() - offset;

  // NOTE(Bacon): For now just normalize everything
  section.startTime = new Date(section.normalizedStartTime);

  section.endTime = section.endTime ?? new Date(section.startTime.getTime() + section.duration);

  //   section.startTime = new Date(offset - section.startTime.getTime());
  if (section.subsections) {
    section.subsections = section.subsections.map(v =>
      normalizePropsRecursive(v, offset, formatter)
    );
  }
  return section;
}

function getSubsectionsGroupedByNodeModule(data: ActivityLogSection) {
  if (!data?.subsections) return {};

  const targets: Record<string, ActivityLogCommandInvocationSection[]> = {};

  function pushSection(section: ActivityLogCommandInvocationSection) {
    if (section.nodeModuleName) {
      if (!(section.nodeModuleName in targets)) {
        targets[section.nodeModuleName] = [];
      }

      targets[section.nodeModuleName].push(section);
    }

    section.subsections?.forEach(section => {
      pushSection(section);
    });
  }

  pushSection(data);

  return targets;
}

function getDataForGroupedSubsections(data: Record<string, ActivityLogCommandInvocationSection[]>) {
  const targets: Record<
    string,
    {
      nodeModuleName: string;
      realDurationMilllis: number;
      realStartTime: number;
      realEndTime: number;
      transitiveDurationMillis: number;
      absolutePhysicalDuration: number;
      transitiveScriptingTimeMillis: number;
      totalDurationMillis: number;
      items: ActivityLogCommandInvocationSection[];
    }
  > = {};

  for (const [nodeModuleName, sections] of Object.entries(data)) {
    let compileSections = sections.filter(section => {
      return section.title.includes('Compile');
      // section.commandDetails?.startsWith('PhaseScriptExecution') ||
      // section.commandDetails?.startsWith('Libtool')
    });

    if (!compileSections.length) {
      // console.log(compileSections.sort((a, b) => b.duration - a.duration));

      compileSections = sections.filter(
        section => section.title === `Run custom shell script '[CP] Copy XCFrameworks'`
      );
      if (!compileSections.length) {
        compileSections = sections;
      }
    }

    // Scripting is often longer than developers expect.
    const transitiveScriptingTimeMillis =
      sections
        .filter(section => section.commandDetails?.startsWith('PhaseScriptExecution'))
        .reduce((prev, curr) => prev + curr.duration, 0) * 1000;

    // const realDurationMillis = sections.reduce((prev, curr) => prev + curr.durationMillis, 0);
    // xcresult uses seconds, so we need to convert to milliseconds
    const transitiveDurationMillis =
      compileSections.reduce((prev, curr) => prev + curr.duration, 0) * 1000;

    const totalDurationMillis = sections.reduce((prev, curr) => prev + curr.duration, 0) * 1000;

    function measurePhysicalTime(sections: ActivityLogCommandInvocationSection[]) {
      const shortestStartTime = sections.reduce(
        (prev, curr) => Math.min(prev, curr.startTime.getTime()),
        Number.MAX_SAFE_INTEGER
      );
      const longestEndTime = sections.reduce(
        (prev, curr) => Math.max(prev, curr.endTime?.getTime?.() ?? 0),
        0
      );
      const normalizedTime = longestEndTime - shortestStartTime;

      return { start: shortestStartTime, stop: longestEndTime, duration: normalizedTime };
    }

    const {
      start: shortestStartTime,
      stop: longestEndTime,
      duration: normalizedTime,
    } = measurePhysicalTime(compileSections);
    const { duration: absolutePhysicalDuration } = measurePhysicalTime(sections);

    targets[nodeModuleName] = {
      nodeModuleName,
      realStartTime: shortestStartTime,
      realEndTime: longestEndTime,
      realDurationMilllis: normalizedTime,
      transitiveDurationMillis,
      transitiveScriptingTimeMillis,
      absolutePhysicalDuration,
      totalDurationMillis,
      items: compileSections,
    };
  }

  return targets;
}

export async function exportChromeTraceAsync(
  projectRoot: string,
  json: Record<string, any>[],
  buildId: string
) {
  await fs.promises.writeFile(
    path.resolve(getTempDirectory(projectRoot, buildId), 'trace.json'),
    JSON.stringify(json, null, 2),
    'utf8'
  );
}

export async function toChromeTraceAsync(data: ActivityLogSection) {
  if (!data.subsections) return [];

  const projectRoot = path.resolve(process.cwd());

  //   printBasicSummary(data);

  //   printBuildTimingSummaries(data);

  //   printAdvancedModuleSummary(projectRoot, data);

  const chromeTracing = createChromeTracingData(projectRoot, data);
  return chromeTracing;
}

function createChromeTracingData(projectRoot: string, data: ActivityLogSection) {
  const formatter = PodfileTracer.create(projectRoot, {
    xcodeProject: resolveXcodeProject(projectRoot),
  });

  const startOffset = getEarliestTimeRecursive(data, Number.MAX_SAFE_INTEGER);
  const normalizedData = normalizePropsRecursive(data, startOffset, formatter);
  // const output = pushSection(normalizePropsRecursive(data, startOffset, formatter), 0).flat();

  const nodeModuleGroups = getSubsectionsGroupedByNodeModule(normalizedData);
  const parsedGroups = getDataForGroupedSubsections(nodeModuleGroups);

  const chromeTracing = Object.values(parsedGroups)
    .map((group, index) => {
      const startTimeMicrosec = group.realStartTime * 1000;
      const endTimeMicrosec = group.realEndTime * 1000;

      const name = group.nodeModuleName;
      const pid = 0;
      const tid = index;
      const mm = (name: string, args: Record<string, string | number>) => {
        return {
          cat: '__metadata',
          pid,
          ph: TrackPhase.thread,
          args,
          tid,
          name,
        };
      };

      const start = {
        name,
        ph: TrackPhase.durationStart,
        pid,
        tid,
        cat: name,
        ts: startTimeMicrosec,
        id: index,
        dur: 0,
      };

      const stop = {
        name,
        ph: TrackPhase.durationEnd,
        pid,
        tid,
        cat: name,
        ts: endTimeMicrosec,
        id: index,
        dur: 0,
      };

      return [
        mm('process_sort_index', { sort_index: index }),
        mm('thread_sort_index', { sort_index: index }),
        // mm('process_name', { name: name }),
        mm('thread_name', { name }),
        // mm('thread_name', { name: "Chrome_ChildIOThread" }),
        // mm('process_labels', { "labels":"The New York Times - Breaking News, World News & Multimedia" }),
        start,
        stop,
        ...group.items
          .map((item, subindex) => {
            const startTimeMillis = Number(item.normalizedStartTime ?? 0);
            const startTimeMicrosec = startTimeMillis * 1000;
            const endTimeMicrosec = (startTimeMillis + Number(item.duration)) * 1000;
            const id = index * 10000 + subindex;

            const name = item.title;
            const pid = 0;
            const tid = index;

            const start = {
              name,
              ph: TrackPhase.durationStart,
              pid,
              tid,
              cat: name,
              ts: startTimeMicrosec,
              id,
              dur: 0,
            };

            const stop = {
              name,
              ph: TrackPhase.durationEnd,
              pid,
              tid,
              cat: name,
              ts: endTimeMicrosec,
              id,
              dur: 0,
            };

            return [start, stop];
          })
          .flat(),
      ];
    })
    .flat();

  return chromeTracing;
}
