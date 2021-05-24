import fs from 'fs-extra';
import { EOL } from 'os';
import path from 'path';
import { Builder, Parser } from 'xml2js';

export type XMLValue = boolean | number | string | null | XMLArray | XMLObject;

export interface XMLArray extends Array<XMLValue> {}

export interface XMLObject {
  [key: string]: XMLValue | undefined;
}

export async function writeXMLAsync(options: { path: string; xml: any }): Promise<void> {
  const xml = new Builder().buildObject(options.xml);
  await fs.ensureDir(path.dirname(options.path));
  await fs.writeFile(options.path, xml);
}

export async function readXMLAsync(options: {
  path: string;
  fallback?: string | null;
}): Promise<XMLObject> {
  let contents: string = '';
  try {
    contents = await fs.readFile(options.path, { encoding: 'utf8', flag: 'r' });
  } catch {
    // catch and use fallback
  }
  const parser = new Parser();
  const manifest = await parser.parseStringPromise(contents || options.fallback || '');
  return manifest;
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
    throw new Error(`Invalid XML value passed in: ${manifest}`);
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
