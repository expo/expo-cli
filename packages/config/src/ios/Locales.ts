import JsonFile from '@expo/json-file';
import { join } from 'path';
import { XcodeProject } from 'xcode';

import { ConfigPlugin, ExpoConfig, IOSPackModifierProps } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';
import { withXcodeProj } from '../plugins/withPlist';
import { addFileToGroup, ensureGroupRecursively } from './utils/Xcodeproj';

export function getLocales(config: ExpoConfig): Record<string, string> | null {
  return config.locales ?? null;
}

export const withLocales: ConfigPlugin = config => {
  return withXcodeProj(config, async props => ({
    ...props,
    ...(await setLocalesAsync(config.expo, props)),
  }));
};

export async function setLocalesAsync(
  config: ExpoConfig,
  props: IOSPackModifierProps<XcodeProject>
): Promise<IOSPackModifierProps<XcodeProject>> {
  const locales = getLocales(config);
  if (!locales) {
    return props;
  }

  let { projectRoot, projectName, data: project } = props;
  // possibly validate CFBundleAllowMixedLocalizations is enabled
  const localesMap = await getResolvedLocalesAsync(projectRoot, locales);

  const supportingDirectory = join(projectRoot, 'ios', projectName, 'Supporting');

  // TODO: Should we delete all before running? Revisit after we land on a lock file.
  const stringName = 'InfoPlist.strings';

  for (const [lang, localizationObj] of Object.entries(localesMap)) {
    const dir = join(supportingDirectory, `${lang}.lproj`);
    // await fs.ensureDir(dir);
    const strings = join(dir, stringName);
    const buffer = [];
    for (const [plistKey, localVersion] of Object.entries(localizationObj)) {
      buffer.push(`${plistKey} = "${localVersion}";`);
    }
    // Write the file to the file system.
    props.pushFile(strings, buffer.join('\n'));

    // deep find the correct folder
    const group = ensureGroupRecursively(project, `${projectName}/Supporting/${lang}.lproj`);

    // Ensure the file doesn't already exist
    if (!group?.children.some(({ comment }) => comment === stringName)) {
      // Only write the file if it doesn't already exist.
      project = addFileToGroup(strings, `${projectName}/Supporting/${lang}.lproj`, project);
    }
  }

  return props;
}

type LocaleMap = Record<string, any>;

async function getResolvedLocalesAsync(
  projectRoot: string,
  input: Record<string, string>
): Promise<LocaleMap> {
  const locales: LocaleMap = {};
  for (const [lang, path] of Object.entries(input)) {
    try {
      locales[lang] = await JsonFile.readAsync(join(projectRoot, path));
    } catch (e) {
      // Add a warning when a json file cannot be parsed.
      addWarningIOS(
        `locales-${lang}`,
        `Failed to parse JSON of locale file for language: ${lang}`,
        'https://docs.expo.io/distribution/app-stores/#localizing-your-ios-app'
      );
    }
  }

  return locales;
}
