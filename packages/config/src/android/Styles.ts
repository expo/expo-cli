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

export function ensureStyleGroup({
  xml,
  parent,
}: {
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): [ResourceXML, ResourceGroupXML] {
  xml = ensureDefaultStyleResourceXML(xml);

  let group = getStyleParent(xml, parent);

  if (!group) {
    group = buildResourceGroup(parent);
    xml.resources!.style!.push(group);
  }
  return [xml, group];
}

export function setStylesItem({
  item,
  ...props
}: {
  item: ResourceItemXML;
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): ResourceXML {
  const [xml, appTheme] = ensureStyleGroup(props);

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

export function removeStyleItem({
  name,
  ...props
}: {
  name: string;
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): ResourceXML {
  const [xml, appTheme] = ensureStyleGroup(props);

  if (appTheme.item) {
    const existingItem = appTheme.item.findIndex(item => item['$'].name === name);
    if (existingItem > -1) {
      appTheme.item.splice(existingItem, 1);
    }
  }
  return xml;
}

export function removeStyleGroup({
  xml,
  parent,
}: {
  xml: ResourceXML;
  parent: { name: string; parent?: string };
}): ResourceXML {
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
  return xml;
}
