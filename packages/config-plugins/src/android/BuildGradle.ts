import fs from 'fs-extra';
import g2js from 'gradle-to-js/lib/parser';

import { getAppBuildGradleFilePath } from './Paths';

// represents gradle command
// e.g. for `:app:buildExampleDebug` -> { moduleName: app, flavor: example, buildType: debug }
interface GradleCommand {
  moduleName?: string;
  flavor?: string;
  buildType?: string;
}

interface Config {
  applicationId?: string;
  versionCode?: string;
  versionName?: string;
}

interface AppBuildGradle {
  android?: {
    defaultConfig?: Config;
    flavorDimensions?: string; // e.g. '"dimension1", "dimension2"'
    productFlavors?: Record<string, Config>;
  };
}

export async function getAppBuildGradleAsync(projectDir: string): Promise<AppBuildGradle> {
  const buildGradlePath = getAppBuildGradleFilePath(projectDir);
  const rawBuildGradle = await fs.readFile(buildGradlePath, 'utf8');
  return await g2js.parseText(rawBuildGradle);
}

export function resolveConfigValue(
  buildGradle: AppBuildGradle,
  field: keyof Config,
  flavor?: string
) {
  return (
    (flavor && buildGradle?.android?.productFlavors?.[flavor]?.[field]) ??
    buildGradle?.android?.defaultConfig?.[field]
  );
}

/**
 * Extract module name, buildType, and flavor from the gradle command.
 *
 * @param cmd can be any valid string that can be added after `./gradlew` call
 * e.g.
 *   - :app:buildDebug
 *   - app:buildDebug
 *   - buildDebug
 *   - buildDebug --console verbose
 * @param buildGradle is used to verify correct casing of the first letter in
 * the flavor name
 **/
export function parseGradleCommand(cmd: string, buildGradle: AppBuildGradle): GradleCommand {
  const hasFlavorDimensions = (buildGradle.android?.flavorDimensions ?? '').split(',').length > 1;
  if (hasFlavorDimensions) {
    throw new Error('flavorDimensions in build.gradle are not supported yet');
  }
  const flavors = new Set(Object.keys(buildGradle?.android?.productFlavors ?? {}));

  // remove any params specified after command name
  const [withoutParams] = cmd.split(' ');

  // remove leading :
  const rawCmd = withoutParams.startsWith(':') ? withoutParams.slice(1) : withoutParams;

  // separate moduleName and rest of the definition
  const splitCmd = rawCmd.split(':');
  const [moduleName, taskName] =
    splitCmd.length > 1 ? [splitCmd[0], splitCmd[1]] : [undefined, splitCmd[0]];

  const matchResult = taskName.match(/(build|bundle|assemble)(.*)(Release|Debug)/);
  if (!matchResult) {
    throw new Error('Failed to parse gradle command');
  }
  let flavor: string | undefined;
  if (matchResult[2]) {
    const [firstLetter, rest] = [matchResult[2].slice(0, 1), matchResult[2].slice(1)];
    // first letter casing is not known based on gradle task name
    // so we need to check both options
    const flavorOptions = [
      firstLetter.toLowerCase().concat(rest),
      firstLetter.toUpperCase().concat(rest),
    ];
    flavorOptions.forEach(option => {
      if (flavors.has(option)) {
        flavor = option;
      }
    });
    if (!flavor) {
      throw new Error(`flavor ${firstLetter.toLowerCase().concat(rest)} is not defined`);
    }
  }
  return {
    moduleName,
    flavor,
    buildType: matchResult[3] ? matchResult[3].toLowerCase() : undefined,
  };
}
