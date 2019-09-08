import path from 'path';

import fs from 'fs-extra';
import { Attribute, parseXml, Document, Element } from 'libxmljs';

const USES_PERMISSION = 'uses-permission';

export function manipulateAttributeInTag(
  doc: Document,
  attribute: string,
  tag: string,
  manipulate: (attribute: Attribute) => any
): Array<any> {
  const elements = doc.find(`//${tag}`);
  return elements.map(element => {
    const targetAttribute = element.attr(attribute);
    if (targetAttribute) {
      return manipulate(targetAttribute);
    }
    return null;
  });
}

export function createPermission(doc: Document, name: string): Element {
  const permission = new Element(doc, USES_PERMISSION);
  permission.attr({ 'android:name': name });
  return permission;
}

export function removePermissions(doc: Document, permissionNames: string[]) {
  const targetNames = permissionNames.map(ensurePermissionNameFormat);

  for (const attribute of getPermissionAttributes(doc)) {
    if (targetNames.includes(attribute.value())) {
      // continue to iterate in case there are duplicates
      attribute.remove();
    }
  }
}

export function addPermission(doc: Document, permission: Element) {
  const elements: Element[] = doc.find(`//${USES_PERMISSION}`);

  if (elements.length) {
    return elements[elements.length - 1].addNextSibling(permission);
  }

  getRoot(doc).addChild(permission);
  return;
}

export function ensurePermission(doc: Document, permissionName: string): boolean {
  const permissions = getPermissions(doc);
  const targetName = ensurePermissionNameFormat(permissionName);

  if (!permissions.includes(targetName)) {
    const permissionElement = createPermission(doc, targetName);
    addPermission(doc, permissionElement);
    return true;
  }
  return false;
}

export function getRoot(doc: Document): Element {
  const root = doc.root();
  if (!root) throw new Error('no root');
  return root;
}

export function findAttributeInTag(doc: Document, attribute: string, tag: string): Attribute[] {
  const values: Array<Attribute | null> = manipulateAttributeInTag(
    doc,
    attribute,
    tag,
    (attribute: Attribute) => {
      return attribute;
    }
  );
  return values.filter(value => value !== null) as Attribute[];
}

function ensurePermissionNameFormat(permissionName: string): string {
  if (permissionName.includes('.')) {
    const com = permissionName.split('.');
    const name = com.pop() as string;
    return [...com, name.toUpperCase()].join('.');
  } else {
    // If shorthand form like `WRITE_CONTACTS` is provided, expand it to `android.permission.WRITE_CONTACTS`.
    return ensurePermissionNameFormat(`android.permission.${permissionName}`);
  }
}

export function getPermissionAttributes(doc: Document): Attribute[] {
  const tags: Attribute[] = [];
  // newly added permissions are found with `android:name` instead of `name` (?)
  for (const id of ['name', 'android:name']) {
    tags.push(...findAttributeInTag(doc, id, 'uses-permission'));
  }
  return tags;
}

export function getPermissions(doc: Document): string[] {
  return getPermissionAttributes(doc).map(element => element.value());
}

export function logManifest(doc: Document) {
  console.log(getRoot(doc).toString());
}

export async function writeAndroidManifestAsync(
  manifestPath: string,
  manifest: any
): Promise<void> {
  await fs.ensureDir(manifestPath);
  await fs.writeFile(manifestPath, manifest);
}

export function getProjectAndroidManifestPath(projectDir: string): string | null {
  const shellPath = path.join(projectDir, 'android');
  if (fs.existsSync(shellPath)) {
    const manifestPath = path.join(shellPath, 'app/src/main/AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      return manifestPath;
    }
  }
  return null;
}

export async function readAsync(manifestPath: string): Promise<Document> {
  const contents = await fs.readFile(manifestPath, { encoding: 'utf8', flag: 'r' });
  const manifest: Document = parseXml(contents);
  return manifest;
}
