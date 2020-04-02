import path from 'path';
import fs from 'fs-extra';
import { Builder, Parser } from 'xml2js';
import { Document } from './Manifest';

export type XMLItem = {
  _: string;
  $: { name: string };
};

export async function getProjectStylesXMLPathAsync(projectDir: string): Promise<string | null> {
  try {
    const shellPath = path.join(projectDir, 'android');
    if ((await fs.stat(shellPath)).isDirectory()) {
      const stylesPath = path.join(shellPath, 'app/src/main/res/values/styles.xml');
      await fs.ensureFile(stylesPath);
      return stylesPath;
    }
  } catch (error) {
    throw new Error(`Could not create android/app/src/main/res/values/styles.xml`);
  }

  return null;
}

export async function readStylesXMLAsync(stylesPath: string): Promise<Document> {
  const contents = await fs.readFile(stylesPath, { encoding: 'utf8', flag: 'r' });
  const parser = new Parser();
  const manifest = parser.parseStringPromise(contents);
  return manifest;
}

export async function writeStylesXMLAsync(stylesPath: string, stylesContent: any): Promise<void> {
  const stylesXml = new Builder().buildObject(stylesContent);
  await fs.ensureDir(path.dirname(stylesPath));
  await fs.writeFile(stylesPath, stylesXml);
}

export function setStylesItem(itemToAdd: XMLItem[], styleFileContentsJSON: Document) {
  let appTheme = styleFileContentsJSON.resources.style.filter(
    (e: any) => e['$']['name'] === 'AppTheme'
  )[0];
  if (appTheme.item) {
    let existingItem = appTheme.item.filter(
      (item: XMLItem) => item['$'].name === itemToAdd[0].$.name
    )[0];

    // Don't want to 2 of the same item, so if one exists, we overwrite it
    if (existingItem) {
      existingItem['_'] = itemToAdd[0]['_'];
    } else {
      appTheme.item = appTheme.item.concat(itemToAdd);
    }
  } else {
    appTheme.item = itemToAdd;
  }
  return styleFileContentsJSON;
}
