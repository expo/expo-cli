import { getProjectResourcePathAsync, ResourceItemXML } from './Resources';
import { readXMLAsync } from './XML';

const BASE_STYLES_XML = `<?xml version="1.0" encoding="utf-8"?><resources></resources>`;

export type ColorResourceXML = {
  resources?: {
    color?: ResourceItemXML[];
  };
};

export async function getProjectColorsXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: string } = {}
): Promise<string | null> {
  return getProjectResourcePathAsync(projectDir, { kind, name: 'colors' });
}

export async function readColorsXMLAsync(path: string): Promise<ColorResourceXML> {
  return readXMLAsync({ path, fallback: BASE_STYLES_XML });
}

export function setColorItem(
  itemToAdd: ResourceItemXML[],
  colorFileContentsJSON: ColorResourceXML
) {
  if (colorFileContentsJSON.resources?.color) {
    const colorNameExists = colorFileContentsJSON.resources.color.filter(
      (e: ResourceItemXML) => e['$'].name === itemToAdd[0]['$'].name
    )[0];
    if (colorNameExists) {
      colorNameExists['_'] = itemToAdd[0]['_'];
    } else {
      colorFileContentsJSON.resources.color = colorFileContentsJSON.resources.color.concat(
        itemToAdd
      );
    }
  } else {
    if (!colorFileContentsJSON.resources || typeof colorFileContentsJSON.resources === 'string') {
      //file was empty and JSON is `{resources : ''}`
      colorFileContentsJSON.resources = {};
    }
    colorFileContentsJSON.resources.color = itemToAdd;
  }
  return colorFileContentsJSON;
}

export function removeColorItem(named: string, contents: ColorResourceXML) {
  if (contents.resources?.color) {
    const index = contents.resources.color.findIndex((e: ResourceItemXML) => e['$'].name === named);
    if (index > -1) {
      // replace the previous value
      contents.resources.color.splice(index, 1);
    }
  }
  return contents;
}
