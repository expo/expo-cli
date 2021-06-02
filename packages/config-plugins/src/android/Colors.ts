import { getResourceXMLPathAsync } from './Paths';
import { buildResourceItem, ResourceItemXML, ResourceKind, ResourceXML } from './Resources';

export function getProjectColorsXMLPathAsync(
  projectRoot: string,
  { kind }: { kind?: ResourceKind } = {}
) {
  return getResourceXMLPathAsync(projectRoot, { kind, name: 'colors' });
}

export function setColorItem(itemToAdd: ResourceItemXML, colorFileContentsJSON: ResourceXML) {
  if (colorFileContentsJSON.resources?.color) {
    const colorNameExists = colorFileContentsJSON.resources.color.filter(
      (e: ResourceItemXML) => e.$.name === itemToAdd.$.name
    )[0];
    if (colorNameExists) {
      colorNameExists._ = itemToAdd._;
    } else {
      colorFileContentsJSON.resources.color.push(itemToAdd);
    }
  } else {
    if (!colorFileContentsJSON.resources || typeof colorFileContentsJSON.resources === 'string') {
      //file was empty and JSON is `{resources : ''}`
      colorFileContentsJSON.resources = {};
    }
    colorFileContentsJSON.resources.color = [itemToAdd];
  }
  return colorFileContentsJSON;
}

export function removeColorItem(named: string, contents: ResourceXML) {
  if (contents.resources?.color) {
    const index = contents.resources.color.findIndex((e: ResourceItemXML) => e.$.name === named);
    if (index > -1) {
      // replace the previous value
      contents.resources.color.splice(index, 1);
    }
  }
  return contents;
}

/**
 * Set or remove value in XML based on nullish factor of the `value` property.
 */
export function assignColorValue(
  xml: ResourceXML,
  {
    value,
    name,
  }: {
    value?: string | null;
    name: string;
  }
) {
  if (value) {
    return setColorItem(
      buildResourceItem({
        name,
        value,
      }),
      xml
    );
  }

  return removeColorItem(name, xml);
}
