import fs from 'fs-extra';
import { Attribute, Document, Element, parseXml } from 'libxmljs';
import { EOL } from 'os';
import path from 'path';

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

export function removePermissions(doc: Document, permissionNames?: string[]) {
  const targetNames = permissionNames ? permissionNames.map(ensurePermissionNameFormat) : null;

  for (const attribute of getPermissionAttributes(doc)) {
    if (targetNames) {
      if (targetNames.includes(attribute.value())) {
        // continue to iterate in case there are duplicates
        attribute.remove();
      }
    } else {
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

export function ensurePermissions(
  doc: Document,
  permissionNames: string[]
): { [permission: string]: boolean } {
  const permissions = getPermissions(doc);

  const results: { [permission: string]: boolean } = {};
  for (const permissionName of permissionNames) {
    const targetName = ensurePermissionNameFormat(permissionName);
    if (!permissions.includes(targetName)) {
      const permissionElement = createPermission(doc, targetName);
      addPermission(doc, permissionElement);
      results[permissionName] = true;
    } else {
      results[permissionName] = false;
    }
  }
  return results;
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

export function ensurePermissionNameFormat(permissionName: string): string {
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

const stringTimesN = (n: number, char: string) => Array(n + 1).join(char);

export function format(manifest: any, { indentLevel = 2, newline = EOL } = {}): string {
  let xmlInput: string;
  if (typeof manifest === 'string') {
    xmlInput = manifest;
  } else if (manifest.toString) {
    xmlInput = manifest.toString();
  } else {
    throw new Error(`@expo/android-manifest: invalid manifest value passed in: ${manifest}`);
  }
  const indentString = stringTimesN(indentLevel, ' ');

  let formatted = '';
  const regex = /(>)(<)(\/*)/g;
  const xml = xmlInput.replace(regex, `$1${newline}$2$3`);
  let pad = 0;
  xml
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .forEach((line: string) => {
      let indent = 0;
      if (line.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (line.match(/^<\/\w/)) {
        // Somehow istanbul doesn't see the else case as covered, although it is. Skip it.
        /* istanbul ignore else  */
        if (pad !== 0) {
          pad -= 1;
        }
      } else if (line.match(/^<\w([^>]*[^\/])?>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      const padding = stringTimesN(pad, indentString);
      formatted += padding + line + newline; // eslint-disable-line prefer-template
      pad += indent;
    });

  return formatted.trim();
}

export async function writeAndroidManifestAsync(
  manifestPath: string,
  manifest: any
): Promise<void> {
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, manifest);
}

export async function getProjectAndroidManifestPathAsync(
  projectDir: string
): Promise<string | null> {
  try {
    const shellPath = path.join(projectDir, 'android');
    if ((await fs.stat(shellPath)).isDirectory()) {
      const manifestPath = path.join(shellPath, 'app/src/main/AndroidManifest.xml');
      if ((await fs.stat(manifestPath)).isFile()) {
        return manifestPath;
      }
    }
  } catch (error) {}

  return null;
}

export async function readAsync(manifestPath: string): Promise<Document> {
  const contents = await fs.readFile(manifestPath, { encoding: 'utf8', flag: 'r' });
  const manifest: Document = parseXml(contents);
  return manifest;
}

export async function persistAndroidPermissionsAsync(
  projectDir: string,
  permissions: string[]
): Promise<boolean> {
  const manifestPath = await getProjectAndroidManifestPathAsync(projectDir);
  // The Android Manifest takes priority over the app.json
  if (!manifestPath) {
    return false;
  }
  const manifest = await readAsync(manifestPath);
  removePermissions(manifest);
  const results = ensurePermissions(manifest, permissions);
  if (Object.values(results).reduce((prev, current) => prev && current, true) === false) {
    const failed = Object.keys(results).filter(key => !results[key]);
    throw new Error(
      `Failed to write the following permissions to the native AndroidManifest.xml: ${failed.join(
        ', '
      )}`
    );
  }
  await writeAndroidManifestAsync(manifestPath, manifest);
  return true;
}

// TODO(Bacon): link to resources about required permission prompts
export const UnimodulePermissions: { [key: string]: string } = {
  'android.permission.READ_INTERNAL_STORAGE': 'READ_INTERNAL_STORAGE',
  'android.permission.ACCESS_COARSE_LOCATION': 'ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION': 'ACCESS_FINE_LOCATION',
  'android.permission.CAMERA': 'CAMERA',
  'android.permission.MANAGE_DOCUMENTS': 'MANAGE_DOCUMENTS',
  'android.permission.READ_CONTACTS': 'READ_CONTACTS',
  'android.permission.READ_CALENDAR': 'READ_CALENDAR',
  'android.permission.WRITE_CALENDAR': 'WRITE_CALENDAR',
  'android.permission.READ_EXTERNAL_STORAGE': 'READ_EXTERNAL_STORAGE',
  'android.permission.READ_PHONE_STATE': 'READ_PHONE_STATE',
  'android.permission.RECORD_AUDIO': 'RECORD_AUDIO',
  'android.permission.USE_FINGERPRINT': 'USE_FINGERPRINT',
  'android.permission.VIBRATE': 'VIBRATE',
  'android.permission.WAKE_LOCK': 'WAKE_LOCK',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'WRITE_EXTERNAL_STORAGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT': 'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.android.launcher.permission.INSTALL_SHORTCUT':
    'com.android.launcher.permission.INSTALL_SHORTCUT',
  'com.google.android.c2dm.permission.RECEIVE': 'com.google.android.c2dm.permission.RECEIVE',
  'com.google.android.gms.permission.ACTIVITY_RECOGNITION':
    'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
  'com.google.android.providers.gsf.permission.READ_GSERVICES':
    'com.google.android.providers.gsf.permission.READ_GSERVICES',
  'com.htc.launcher.permission.READ_SETTINGS': 'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT': 'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.majeur.launcher.permission.UPDATE_BADGE': 'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.sec.android.provider.badge.permission.READ':
    'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE':
    'com.sec.android.provider.badge.permission.WRITE',
  'com.sonyericsson.home.permission.BROADCAST_BADGE':
    'com.sonyericsson.home.permission.BROADCAST_BADGE',
};
