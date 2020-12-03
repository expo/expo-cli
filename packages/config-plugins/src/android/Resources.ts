import fs from 'fs-extra';
import { join } from 'path';

import { assert } from '../utils/errors';
import { getResourceFolderAsync, getThemedResourcePathsAsync } from './Paths';
import { readXMLAsync, writeXMLAsync, XMLObject } from './XML';

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

export type ResourceType = 'values' | 'mipmap' | 'drawable' | 'layout';

export type ThemedResources = {
  /**
   * Default `android/app/src/main/res/values/[filename].xml` file as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
   */
  main: ResourceXML;
  /**
   * Optional `android/app/src/main/res/values-night/[filename].xml` as JSON.
   * Used for dark mode values. If nullish, the file won't be written.
   */
  night?: ResourceXML;
  /**
   * Optional `android/app/src/main/res/values-v23/[filename].xml` as JSON.
   * Used for Android v23 values. If nullish, the file won't be written.
   */
  v23?: ResourceXML;
};

const fallbackResourceString = `<?xml version="1.0" encoding="utf-8"?><resources></resources>`;

/**
 * Read the themed resources XML files while providing a default fallback for resource files.
 */
export async function readThemedResourcesAsync({
  projectRoot,
  resourceName,
  resourceType,
  fallback = fallbackResourceString,
}: {
  projectRoot: string;
  resourceName: string;
  resourceType: ResourceType;
  fallback?: string;
}): Promise<ThemedResources> {
  const paths = await getThemedResourcePathsAsync(projectRoot, resourceType, resourceName);

  const resources: Record<string, ResourceXML> = {};

  for (const [name, filePath] of Object.entries(paths)) {
    const isDefault = name === 'main';
    resources[name] = await readResourcesXMLAsync({
      path: filePath,
      fallback: isDefault ? fallback : null,
    });
  }

  return resources as ThemedResources;
}

/**
 * Write or remove resource files based on the `ThemedResource` object.
 *
 * @param resourceName file name without xml extension.
 */
export async function commitThemedResourcesAsync({
  projectRoot,
  resources,
  resourceType,
  resourceName,
}: {
  projectRoot: string;
  resources: ThemedResources;
  resourceType: ResourceType;
  resourceName: string;
}): Promise<ThemedResources> {
  assert(
    !resourceType.includes('-'),
    `Themed resourceType "${resourceType}" cannot include a hyphen`
  );
  const resFolder = await getResourceFolderAsync(projectRoot);

  for (const [name, contents] of Object.entries(resources)) {
    let filename = resourceType;
    const isDefault = name === 'main';
    if (!isDefault && name !== resourceType) {
      filename += `-${name}`;
    }

    const filePath = join(resFolder, filename, `${resourceName}.xml`);

    if (contents) {
      await writeXMLAsync({ path: filePath, xml: contents });
    } else if (!isDefault) {
      // Delete nullish entries that aren't the main file.
      await fs.remove(filePath);
    }
  }

  return resources as ThemedResources;
}

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
  fallback?: string | null;
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
