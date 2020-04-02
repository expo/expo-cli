import fs from 'fs-extra';
import { Builder, Parser } from 'xml2js';

import { EOL } from 'os';
import path from 'path';

const USES_PERMISSION = 'uses-permission';

export type Document = { [key: string]: any };

export function removePermissions(doc: Document, permissionNames?: string[]) {
  const targetNames = permissionNames ? permissionNames.map(ensurePermissionNameFormat) : null;
  const permissions = doc.manifest[USES_PERMISSION] || [];
  let nextPermissions = [];
  for (let attribute of permissions) {
    if (targetNames) {
      const value = attribute['$']['android:name'] || attribute['$']['name'];
      if (!targetNames.includes(value)) {
        nextPermissions.push(attribute);
      }
    }
  }

  doc.manifest[USES_PERMISSION] = nextPermissions;
}

export function addPermission(doc: Document, permissionName: string): void {
  const usesPermissions: { [key: string]: any }[] = doc.manifest[USES_PERMISSION] || [];
  usesPermissions.push({
    $: { 'android:name': permissionName },
  });
  doc.manifest[USES_PERMISSION] = usesPermissions;
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
      addPermission(doc, targetName);
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
    addPermission(doc, targetName);
    return true;
  }
  return false;
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

export type InputOptions = {
  manifestPath?: string | null;
  projectRoot?: string | null;
  manifest?: Document | null;
};

export function logManifest(doc: Document) {
  const builder = new Builder();
  const xmlInput = builder.buildObject(doc);
  console.log(xmlInput);
}

const stringTimesN = (n: number, char: string) => Array(n + 1).join(char);

export function format(manifest: any, { indentLevel = 2, newline = EOL } = {}): string {
  let xmlInput: string;
  if (typeof manifest === 'string') {
    xmlInput = manifest;
  } else if (manifest.toString) {
    const builder = new Builder({ headless: true });
    xmlInput = builder.buildObject(manifest);
    return xmlInput;
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
  const manifestXml = new Builder().buildObject(manifest);
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, manifestXml);
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
export async function getAndroidManifestPathAsync(projectDir: string): Promise<string | null> {
  try {
    const manifestPath = path.join(projectDir, 'app/src/main/AndroidManifest.xml');
    if ((await fs.stat(manifestPath)).isFile()) {
      return manifestPath;
    }
  } catch (error) {}

  return null;
}

export async function readAndroidManifestAsync(manifestPath: string): Promise<Document> {
  const contents = await fs.readFile(manifestPath, { encoding: 'utf8', flag: 'r' });
  const parser = new Parser();
  const manifest = parser.parseStringPromise(contents);
  return manifest;
}

export async function resolveInputOptionsAsync(options: InputOptions): Promise<Document> {
  if (options.manifest) return options.manifest;
  if (options.manifestPath) return await readAndroidManifestAsync(options.manifestPath);
  if (options.projectRoot) {
    const manifestPath = await getAndroidManifestPathAsync(options.projectRoot);
    return resolveInputOptionsAsync({ manifestPath });
  }
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
  const manifest = await readAndroidManifestAsync(manifestPath);
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
  throw new Error('Cannot resolve a valid AndroidManifest.xml');
}

export async function resolveOutputOptionsAsync(options: InputOptions): Promise<string> {
  if (options.manifestPath) return options.manifestPath;
  if (options.projectRoot) {
    const manifestPath = await getAndroidManifestPathAsync(options.projectRoot);
    return resolveOutputOptionsAsync({ manifestPath });
  }
  throw new Error('Cannot resolve an output for writing AndroidManifest.xml');
}

export async function getPackageAsync(options: InputOptions): Promise<string | null> {
  const manifest = await resolveInputOptionsAsync(options);
  return manifest.manifest?.['$']?.package ?? null;
}
