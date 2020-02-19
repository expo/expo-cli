import fs from 'fs-extra';
import path from 'path';
import { LocaleMap, getResolvedLocalesAsync } from './ExponentTools';
import {
  AnyStandaloneContext,
  isStandaloneContextService,
  isStandaloneContextUser,
} from './StandaloneContext';

export async function writeLocalizationResourcesAsync({
  supportingDirectory,
  context,
}: {
  supportingDirectory: string;
  context: AnyStandaloneContext;
}): Promise<void> {
  let locales: LocaleMap = {};
  if (isStandaloneContextUser(context)) {
    locales = await getResolvedLocalesAsync(context.config);
  } else if (isStandaloneContextService(context)) {
    locales = context.config.locales !== undefined ? context.config.locales : {};
  }
  for (const [lang, localizationObj] of Object.entries(locales)) {
    const dir = path.join(supportingDirectory, `${lang}.lproj`);
    fs.mkdirpSync(dir);
    const strings = path.join(dir, 'InfoPlist.strings');
    const buffer = [];
    for (const [plistKey, localVersion] of Object.entries(localizationObj)) {
      buffer.push(`${plistKey} = "${localVersion}";`);
    }
    await fs.writeFile(strings, buffer.join('\n'));
  }
}
