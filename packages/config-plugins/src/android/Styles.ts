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
    let matches = e.$.name === parent.name;
    if (parent.parent != null && matches) {
      matches = e.$.parent === parent.parent;
    }
    return matches;
  })?.[0];
  return app ?? null;
}

export function getStylesItem({
  name,
  xml,
  parent,
}: {
  name: string;
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): ResourceItemXML | null {
  xml = ensureDefaultStyleResourceXML(xml);

  const appTheme = getStyleParent(xml, parent);

  if (!appTheme) {
    return null;
  }

  if (appTheme.item) {
    const existingItem = appTheme.item.filter(_item => _item.$.name === name)[0];

    // Don't want to 2 of the same item, so if one exists, we overwrite it
    if (existingItem) {
      return existingItem;
    }
  }
  return null;
}

export function setStylesItem({
  item,
  xml,
  parent,
}: {
  item: ResourceItemXML;
  xml: ResourceXML;
  parent: { name: string; parent: string };
}): ResourceXML {
  xml = ensureDefaultStyleResourceXML(xml);

  let appTheme = getStyleParent(xml, parent);

  if (!appTheme) {
    appTheme = buildResourceGroup(parent);
    xml.resources!.style!.push(appTheme);
  }

  if (appTheme.item) {
    const existingItem = appTheme.item.filter(_item => _item.$.name === item.$.name)[0];

    // Don't want to 2 of the same item, so if one exists, we overwrite it
    if (existingItem) {
      existingItem._ = item._;
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
  xml = ensureDefaultStyleResourceXML(xml);
  const appTheme = getStyleParent(xml, parent);
  if (appTheme?.item) {
    const index = appTheme.item.findIndex((e: ResourceItemXML) => e.$.name === name);
    if (index > -1) {
      appTheme.item.splice(index, 1);
    }
  }
  return xml;
}
