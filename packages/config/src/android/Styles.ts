import { getResourceXMLPathAsync } from './Paths';
import {
  buildResourceGroup,
  ensureDefaultResourceXML,
  ResourceGroupXML,
  ResourceItemXML,
  ResourceKind,
  ResourceXML,
} from './Resources';

export async function getProjectStylesXMLPathAsync(
  projectRoot: string,
  { kind }: { kind?: ResourceKind } = {}
): Promise<string> {
  return getResourceXMLPathAsync(projectRoot, { kind, name: 'styles' });
}

function ensureDefaultStyleResourceXML(xml: ResourceXML): ResourceXML {
  xml = ensureDefaultResourceXML(xml);
  if (!Array.isArray(xml?.resources?.style)) {
    xml.resources.style = [];
  }
  return xml;
}

export function getStyleParent(
  xml: ResourceXML,
  parent: { name: string; parent?: string }
): ResourceGroupXML | null {
  const app = xml?.resources?.style?.filter?.((e: any) => {
    let matches = e['$']['name'] === parent.name;
    if (parent.parent != null && matches) {
      matches = e['$']['parent'] === parent.parent;
    }
    return matches;
  })?.[0];
  return app ?? null;
}

export function ensureStylesObject({
  xml,
  parent,
}: {
  item: ResourceItemXML;
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): [ResourceXML, ResourceGroupXML] {
  xml = ensureDefaultStyleResourceXML(xml);

  let appTheme = getStyleParent(xml, parent);

  if (!appTheme) {
    appTheme = buildResourceGroup(parent);
    xml.resources!.style!.push(appTheme);
  }

  return [xml, appTheme];
}

export function setStylesItem({
  item,
  xml,
  parent,
}: {
  item: XMLItem[];
  xml: Document;
  parent: { name: string; parent: string };
}): Document {
  const results = ensureStylesObject({ xml, parent });
  xml = results[0];
  const appTheme = results[1];

  if (appTheme.item) {
    const existingItem = appTheme.item.filter(_item => _item['$'].name === item.$.name)[0];

    // Don't want to 2 of the same item, so if one exists, we overwrite it
    if (existingItem) {
      existingItem['_'] = item['_'];
    } else {
      appTheme.item.push(item);
    }
  } else {
    appTheme.item = [item];
  }
  return xml;
}

export function removeStylesItem({
  name,
  xml,
  parent,
}: {
  name: string;
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): ResourceXML {
  const results = ensureStylesObject({ xml, parent });
  xml = results[0];
  const appTheme = results[1];

  if (appTheme.item) {
    const existingItem = appTheme.item.findIndex((_item: XMLItem) => _item['$'].name === name);
    if (existingItem > -1) {
      appTheme.item.splice(existingItem, 1);
    }
  }
  return xml;
}

export function removeStyleParent({
  xml,
  parent,
}: {
  xml: ResourceXML;
  parent: { name: string; parent?: string };
}): [Document, boolean] {
  xml = ensureDefaultStyleResourceXML(xml);

  const index =
    xml.resources.style?.findIndex?.((e: any) => {
      let matches = e['$']['name'] === parent.name;
      if (parent.parent != null && matches) {
        matches = e['$']['parent'] === parent.parent;
      }
      return matches;
    }) ?? -1;
  const shouldRemove = index > -1;
  if (xml.resources.style && shouldRemove) {
    xml.resources.style.splice(index, 1);
  }
  return [xml, shouldRemove];
}
