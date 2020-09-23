import fs from 'fs-extra';
import path from 'path';
import { Builder } from 'xml2js';

import { Document, getProjectResourcePathAsync, readXMLAsync } from './Manifest';
import { XMLItem } from './Styles';

const BASE_STRINGS_XML = `<resources></resources>`;

export async function getProjectStringsXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: string } = {}
): Promise<string | null> {
  return getProjectResourcePathAsync(projectDir, { kind, name: 'strings' });
}

export async function readStringsXMLAsync(stringsPath: string): Promise<Document> {
  return readXMLAsync({ path: stringsPath, fallback: BASE_STRINGS_XML });
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
