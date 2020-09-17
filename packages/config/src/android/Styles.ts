import fs from 'fs-extra';
import path from 'path';
import { Builder } from 'xml2js';

import { Document, getProjectXMLPathAsync, readXMLAsync } from './Manifest';

export type XMLItem = {
  _: string;
  $: { name: string };
};

export async function getProjectStylesXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: string } = {}
): Promise<string | null> {
  return getProjectXMLPathAsync(projectDir, { kind, name: 'styles' });
}

export async function readStylesXMLAsync(path: string): Promise<Document> {
  return readXMLAsync({ path });
}

export async function writeStylesXMLAsync(stylesPath: string, stylesContent: any): Promise<void> {
  const stylesXml = new Builder().buildObject(stylesContent);
  await fs.ensureDir(path.dirname(stylesPath));
  await fs.writeFile(stylesPath, stylesXml);
}

export function setStylesItem(itemToAdd: XMLItem[], styleFileContentsJSON: Document) {
  const appTheme = styleFileContentsJSON.resources.style.filter(
    (e: any) => e['$']['name'] === 'AppTheme'
  )[0];
  if (appTheme.item) {
    const existingItem = appTheme.item.filter(
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
