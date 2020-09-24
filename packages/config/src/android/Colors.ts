import { getResourceXMLPathAsync } from './Paths';
import { ResourceItemXML, ResourceKind, ResourceXML } from './Resources';

export async function getProjectColorsXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: ResourceKind } = {}
): Promise<string> {
  return getResourceXMLPathAsync(projectDir, { kind, name: 'colors' });
}

export function setColorItem(itemToAdd: ResourceItemXML[], colorFileContentsJSON: ResourceXML) {
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

export function removeColorItem(named: string, contents: ResourceXML) {
  if (contents.resources?.color) {
    const index = contents.resources.color.findIndex((e: ResourceItemXML) => e['$'].name === named);
    if (index > -1) {
      // replace the previous value
      contents.resources.color.splice(index, 1);
    }
  }
  return contents;
}
