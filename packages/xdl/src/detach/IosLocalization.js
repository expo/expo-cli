import fs from 'fs-extra';
import path from 'path';
import mkdirp from 'mkdirp';
import { getResolvedLocalesAsync } from './ExponentTools';

export async function writeLocalizationResourcesAsync({ supportingDirectory, context }) {
  let locales = {};
  if (context.type === 'user') {
    locales = await getResolvedLocalesAsync(context.config);
  } else if (context.type === 'service') {
    locales = context.config.locales !== undefined ? context.config.locales : {};
  }
  for (const [lang, localizationObj] of Object.entries(locales)) {
    const dir = path.join(supportingDirectory, `${lang}.lproj`);
    mkdirp.sync(dir);
    const strings = path.join(dir, 'InfoPlist.strings');
    const buffer = [];
    for (const [plistKey, localVersion] of Object.entries(localizationObj)) {
      buffer.push(`${plistKey} = "${localVersion}";`);
    }
    await fs.writeFile(strings, buffer.join('\n'));
  }
}
