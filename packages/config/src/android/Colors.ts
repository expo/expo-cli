import { Document, getProjectXMLPathAsync, readXMLAsync } from './Manifest';
import { XMLItem } from './Styles';

export const BASE_COLORS_XML = `<?xml version="1.0" encoding="utf-8"?><resources></resources>`;

export async function getProjectColorsXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: string } = {}
): Promise<string | null> {
  return getProjectXMLPathAsync(projectDir, { kind, name: 'colors' });
}

export async function readColorsXMLAsync(path: string): Promise<Document> {
  return readXMLAsync({ path, fallback: BASE_COLORS_XML });
}

export function setColorItem(itemToAdd: XMLItem[], colorFileContentsJSON: Document) {
  if (colorFileContentsJSON.resources?.color) {
    const colorNameExists = colorFileContentsJSON.resources.color.filter(
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

export function removeColorItem(named: string, contents: Document) {
  if (contents.resources?.color) {
    const index = contents.resources.color.findIndex((e: XMLItem) => e['$'].name === named);
    if (index > -1) {
      // replace the previous value
      contents.resources.color.splice(index, 1);
    }
  }
  return contents;
}
