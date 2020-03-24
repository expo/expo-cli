import path from 'path';
import fs from 'fs-extra';
import { Builder, Parser } from 'xml2js';
import { Document } from './Manifest';
import { XMLItem } from './Styles';

const BASE_STYLES_XML = `<?xml version="1.0" encoding="utf-8"?><resources></resources>`;

export async function getProjectColorsXMLPathAsync(projectDir: string): Promise<string | null> {
  try {
    const shellPath = path.join(projectDir, 'android');
    if ((await fs.stat(shellPath)).isDirectory()) {
      const colorsPath = path.join(shellPath, 'app/src/main/res/values/colors.xml');
      await fs.ensureFile(colorsPath);
      return colorsPath;
    }
  } catch (error) {
    throw new Error('No android directory found in your project.');
  }

  return null;
}

export async function readColorsXMLAsync(colorsPath: string): Promise<Document> {
  const contents = await fs.readFile(colorsPath, { encoding: 'utf8', flag: 'r' });
  const parser = new Parser();
  const manifest = parser.parseStringPromise(contents || BASE_STYLES_XML);
  return manifest;
}

export async function writeColorsXMLAsync(colorsPath: string, colorsContent: any): Promise<void> {
  const colorsXml = new Builder().buildObject(colorsContent);
  await fs.ensureDir(path.dirname(colorsPath));
  await fs.writeFile(colorsPath, colorsXml);
}

export function setColorItem(itemToAdd: XMLItem[], colorFileContentsJSON: Document) {
  if (colorFileContentsJSON.resources.color) {
    let colorNameExists = colorFileContentsJSON.resources.color.filter(
      (e: XMLItem) => e['$'].name === itemToAdd[0]['$'].name
    )[0];
    if (colorNameExists) {
      colorNameExists['_'] = itemToAdd[0]['_'];
    } else {
      colorFileContentsJSON.resources.color = colorFileContentsJSON.resources.color.concat(
        itemToAdd
      );
    }
  } else {
    if (typeof colorFileContentsJSON.resources === 'string') {
      //file was empty and JSON is `{resources : ''}`
      colorFileContentsJSON.resources = {};
    }
    colorFileContentsJSON.resources.color = itemToAdd;
  }
  return colorFileContentsJSON;
}
