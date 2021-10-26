import { PodfileTracer } from '@expo/xcpretty';
import assert from 'assert';

import { ActivityLogCommandInvocationSection, ActivityLogSection } from './XCResult.types';

export function transformXCResults(input: any): any {
  assert(input._type?._name, 'Missing `_type.name` on input JSON: ' + input);

  const {
    _type: { _name: type },
    ...rest
  } = input;

  if (type === 'Array') {
    return rest._values.map(transformXCResults);
  } else if (type === 'String') {
    return rest._value;
  } else if (type === 'Bool') {
    return rest._value === 'true';
  } else if (type === 'Int' || type === 'Double') {
    return Number(rest._value);
  } else if (type === 'Date') {
    return new Date(rest._value);
  }

  return Object.entries(rest).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: transformXCResults(value),
    }),
    {}
  );
}

export function getEarliestTimeRecursive(section: ActivityLogSection, offset: number): number {
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

export function normalizePropsRecursive(
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

export function getSubsectionsGroupedByNodeModule(data: ActivityLogSection) {
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

export function getDataForGroupedSubsections(
  data: Record<string, ActivityLogCommandInvocationSection[]>
) {
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
