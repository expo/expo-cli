import { getResourceXMLAsync } from './Paths';
import { ResourceItemXML, ResourceKind } from './Resources';

export type StyleResourceGroupXML = {
  $: {
    name: string;
    parent: string;
  };
  item: ResourceItemXML[];
};

export type StyleResourceXML = {
  resources?: {
    style?: StyleResourceGroupXML[];
  };
};

export async function getProjectStylesXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: ResourceKind } = {}
): Promise<string> {
  return getResourceXMLAsync(projectDir, { kind, name: 'styles' });
}

export function buildItem({ name, value }: { name: string; value: string }): ResourceItemXML {
  return { _: value, $: { name } };
}

function ensureStyleShape(xml: StyleResourceXML): StyleResourceXML {
  if (!xml) {
    xml = {};
  }
  if (!xml.resources) {
    xml.resources = {};
  }
  if (!Array.isArray(xml?.resources?.style)) {
    xml.resources.style = [];
  }
  return xml;
}

function buildParent(parent: {
  name: string;
  parent: string;
  items?: any[];
}): StyleResourceGroupXML {
  return {
    $: { name: parent.name, parent: parent.parent },
    item: parent.items ?? [],
  };
}

export function getStyleParent(
  xml: StyleResourceXML,
  parent: { name: string; parent?: string }
): StyleResourceGroupXML | null {
  const app = xml?.resources?.style?.filter?.((e: any) => {
    let matches = e['$']['name'] === parent.name;
    if (parent.parent != null && matches) {
      matches = e['$']['parent'] === parent.parent;
    }
    return matches;
  })?.[0];
  return app ?? null;
}

export function setStylesItem({
  item,
  xml,
  parent,
}: {
  item: ResourceItemXML[];
  xml: StyleResourceXML;
  parent: { name: string; parent: string };
}): StyleResourceXML {
  xml = ensureStyleShape(xml);

  let appTheme = getStyleParent(xml, parent);

  if (!appTheme) {
    appTheme = buildParent(parent);
    xml.resources!.style!.push(appTheme);
  }

  if (appTheme.item) {
    const existingItem = appTheme.item.filter(_item => _item['$'].name === item[0].$.name)[0];

    // Don't want to 2 of the same item, so if one exists, we overwrite it
    if (existingItem) {
      existingItem['_'] = item[0]['_'];
    } else {
      appTheme.item = appTheme.item.concat(item);
    }
  } else {
    appTheme.item = item;
  }
  return xml;
}
