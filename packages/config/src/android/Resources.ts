import { readXMLAsync, XMLObject } from './XML';

export type ResourceGroupXML = {
  $: {
    name: string;
    parent: string;
  };
  item: ResourceItemXML[];
};

export type ResourceXML = {
  resources: {
    color?: ResourceItemXML[];
    string?: ResourceItemXML[];
    style?: ResourceGroupXML[];
    // Add more if needed...
  };
};

export type ResourceItemXML = {
  _: string;
  $: {
    name: string;
  };
};
/**
 * Name of the resource folder.
 */
export type ResourceKind = 'values' | 'values-night' | 'values-v23';

const fallbackResourceString = `<?xml version="1.0" encoding="utf-8"?><resources></resources>`;

/**
 * Read an XML file while providing a default fallback for resource files.
 *
 * @param options path to the XML file, returns a fallback XML if the path doesn't exist.
 */
export async function readResourcesXMLAsync({
  path,
  fallback = fallbackResourceString,
}: {
  path: string;
  fallback?: string;
}): Promise<ResourceXML> {
  const xml = await readXMLAsync({ path, fallback });
  // Ensure the type is expected.
  if (!xml.resources) {
    xml.resources = {};
  }
  return xml as ResourceXML;
}

/**
 * Ensure the provided xml has a `resources` object (the expected shape).
 *
 * @param xml
 */
export function ensureDefaultResourceXML(xml: XMLObject): ResourceXML {
  if (!xml) {
    xml = { resources: {} };
  }
  if (!xml.resources) {
    xml.resources = {};
  }

  return xml as ResourceXML;
}

/**
 * Build a `ResourceItemXML` given its `name` and `value`. This makes things a bit more readable.
 *
 * - JSON: `{ $: { name }, _: value }`
 * - XML: `<item name="NAME">VALUE</item>`
 *
 * @param props name and value strings.
 */
export function buildResourceItem({
  name,
  value,
}: {
  name: string;
  value: string;
}): ResourceItemXML {
  return { $: { name }, _: value };
}

export function buildResourceGroup(parent: {
  name: string;
  parent: string;
  items?: ResourceItemXML[];
}): ResourceGroupXML {
  return {
    $: { name: parent.name, parent: parent.parent },
    item: parent.items ?? [],
  };
}
