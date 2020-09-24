import { getResourceXMLAsync } from './Paths';
import { ResourceItemXML, ResourceKind } from './Resources';
import { readXMLAsync } from './XML';

const BASE_STRINGS_XML = `<resources></resources>`;

export type StringsResourceXML = {
  resources?: {
    string?: ResourceItemXML[];
  };
};

export async function getProjectStringsXMLPathAsync(
  projectDir: string,
  { kind = 'values' }: { kind?: ResourceKind } = {}
): Promise<string> {
  return getResourceXMLAsync(projectDir, { kind, name: 'strings' });
}

export async function readStringsXMLAsync(stringsPath: string): Promise<StringsResourceXML> {
  return readXMLAsync({ path: stringsPath, fallback: BASE_STRINGS_XML });
}

export function setStringItem(
  itemToAdd: ResourceItemXML[],
  stringFileContentsJSON: StringsResourceXML
): StringsResourceXML {
  if (stringFileContentsJSON?.resources?.string) {
    const stringNameExists = stringFileContentsJSON.resources.string.filter(
      (e: ResourceItemXML) => e['$'].name === itemToAdd[0]['$'].name
    )[0];
    if (stringNameExists) {
      // replace the previous value
      stringNameExists['_'] = itemToAdd[0]['_'];
    } else {
      stringFileContentsJSON.resources.string = stringFileContentsJSON.resources.string.concat(
        itemToAdd
      );
    }
  } else {
    if (!stringFileContentsJSON.resources || typeof stringFileContentsJSON.resources === 'string') {
      // file was empty and JSON is `{resources : ''}`
      stringFileContentsJSON.resources = {};
    }
    stringFileContentsJSON.resources.string = itemToAdd;
  }
  return stringFileContentsJSON;
}

export function removeStringItem(
  named: string,
  stringFileContentsJSON: StringsResourceXML
): StringsResourceXML {
  if (stringFileContentsJSON?.resources?.string) {
    const stringNameExists = stringFileContentsJSON.resources.string.findIndex(
      (e: ResourceItemXML) => e['$'].name === named
    );
    if (stringNameExists > -1) {
      // replace the previous value
      stringFileContentsJSON.resources.string.splice(stringNameExists, 1);
    }
  }
  return stringFileContentsJSON;
}
