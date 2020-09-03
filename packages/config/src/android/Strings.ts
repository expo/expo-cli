import fs from 'fs-extra';
import path from 'path';
import { Builder, Parser } from 'xml2js';

import { Document } from './Manifest';
import { XMLItem } from './Styles';

const BASE_STRINGS_XML = `<resources></resources>`;

export async function getProjectStringsXMLPathAsync(projectDir: string): Promise<string | null> {
  try {
    const shellPath = path.join(projectDir, 'android');
    if ((await fs.stat(shellPath)).isDirectory()) {
      const stringsPath = path.join(shellPath, 'app/src/main/res/values/strings.xml');
      await fs.ensureFile(stringsPath);
      return stringsPath;
    }
  } catch (error) {
    throw new Error('No android directory found in your project.');
  }

  return null;
}

export async function readStringsXMLAsync(stringsPath: string): Promise<Document> {
  const contents = await fs.readFile(stringsPath, { encoding: 'utf8', flag: 'r' });
  const parser = new Parser();
  const manifest = parser.parseStringPromise(contents || BASE_STRINGS_XML);
  return manifest;
}

export async function writeStringsXMLAsync(
  stringsPath: string,
  stringsContent: any
): Promise<void> {
  const stringsXml = new Builder().buildObject(stringsContent);
  await fs.ensureDir(path.dirname(stringsPath));
  await fs.writeFile(stringsPath, stringsXml);
}

export function setStringItem(itemToAdd: XMLItem[], stringFileContentsJSON: Document) {
  if (stringFileContentsJSON.resources.string) {
    const stringNameExists = stringFileContentsJSON.resources.string.filter(
      (e: XMLItem) => e['$'].name === itemToAdd[0]['$'].name
    )[0];
    if (stringNameExists) {
      // replace the previous value
      stringNameExists['_'] = itemToAdd[0]['_'];
    } else {
      stringFileContentsJSON.resources.string = stringFileContentsJSON.resources.string.concat(
        itemToAdd
      );
    }
  } else {
    if (typeof stringFileContentsJSON.resources === 'string') {
      // file was empty and JSON is `{resources : ''}`
      stringFileContentsJSON.resources = {};
    }
    stringFileContentsJSON.resources.string = itemToAdd;
  }
  return stringFileContentsJSON;
}

export function removeStringItem(named: string, stringFileContentsJSON: Document) {
  if (stringFileContentsJSON.resources.string) {
    const stringNameExists = stringFileContentsJSON.resources.string.findIndex(
      (e: XMLItem) => e['$'].name === named
    );
    if (stringNameExists > -1) {
      // replace the previous value
      stringFileContentsJSON.resources.string.splice(stringNameExists, 1);
    }
  }
  return stringFileContentsJSON;
}
