import fs from 'fs-extra';
import { EOL } from 'os';
import path from 'path';
import { Builder, Parser } from 'xml2js';

export type Document = { [key: string]: any };

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
      } else if (line.match(/^<\w([^>]*[^/])?>.*$/)) {
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
  const manifestXml = format(manifest);
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

export async function readAndroidManifestAsync(manifestPath: string): Promise<Document> {
  const contents = await fs.readFile(manifestPath, { encoding: 'utf8', flag: 'r' });
  const parser = new Parser();
  const manifest = parser.parseStringPromise(contents);
  return manifest;
}

export async function getPackageAsync(manifest: Document): Promise<string | null> {
  return manifest.manifest?.['$']?.package ?? null;
}

export function getMainActivity(manifest: Document): any | null {
  const mainActivity = manifest.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );
  return mainActivity[0] ?? null;
}

export function addMetaDataItemToMainApplication(
  mainApplication: any,
  itemName: string,
  itemValue: string
) {
  let existingMetaDataItem;
  const newItem = {
    $: {
      'android:name': itemName,
      'android:value': itemValue,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingMetaDataItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === itemName
    );
    if (existingMetaDataItem.length) {
      existingMetaDataItem[0]['$']['android:value'] = itemValue;
    } else {
      mainApplication['meta-data'].push(newItem);
    }
  } else {
    mainApplication['meta-data'] = [newItem];
  }
  return mainApplication;
}
