import fs from 'fs-extra';
import path from 'path';
import { Builder } from 'xml2js';

import { Document, getProjectXMLPathAsync } from './Manifest';

export type XMLItem = {
  _: string;
  $: { name: string; [key: string]: string };
};

export async function getProjectStylesXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: string } = {}
): Promise<string | null> {
  return getProjectXMLPathAsync(projectDir, { kind, name: 'styles' });
}

export async function writeStylesXMLAsync(options: { path: string; xml: any }): Promise<void> {
  const stylesXml = new Builder().buildObject(options.xml);
  await fs.ensureDir(path.dirname(options.path));
  await fs.writeFile(options.path, stylesXml);
}

export function buildItem({
  name,
  parent,
  value,
}: {
  name: string;
  parent?: string;
  value: string;
}): XMLItem {
  const item: XMLItem = { _: value, $: { name } };
  if (parent) {
    item['$'].parent = parent;
  }
  return item;
}

function ensureStyleShape(xml: Document): Document {
  if (!xml) {
    xml = {};
  }
  if (!xml.resources) {
    xml.resources = {};
  }
  if (!Array.isArray(xml.resources.style)) {
    xml.resources.style = [];
  }
  return xml;
}

function buildParent(parent: { name: string; parent: string; items?: any[] }): Document {
  return {
    $: { name: parent.name, parent: parent.parent },
    item: parent.items ?? [],
  };
}

export function getStyleParent(
  xml: Document,
  parent: { name: string; parent?: string }
): Document | null {
  const app = xml.resources.style.filter?.((e: any) => {
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
  item: XMLItem[];
  xml: Document;
  parent: { name: string; parent: string };
}): Document {
  xml = ensureStyleShape(xml);

  let appTheme = getStyleParent(xml, parent);

  if (!appTheme) {
    appTheme = buildParent(parent);
    xml.resources.style.push(appTheme);
  }

  if (appTheme.item) {
    const existingItem = appTheme.item.filter(
      (_item: XMLItem) => _item['$'].name === item[0].$.name
    )[0];

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
