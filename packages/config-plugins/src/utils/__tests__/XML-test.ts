import { vol } from 'memfs';

import { buildResourceItem, readResourcesXMLAsync } from '../../android/Resources';
import { setStringItem } from '../../android/Strings';
import { escapeAndroidString, format } from '../XML';

jest.mock('fs');

export const sampleStringsXML = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<resources>
  <string name="app_name">expo &amp;bo&lt;y&gt;&apos;</string>
</resources>`;

beforeAll(async () => {
  const directoryJSON = {
    './android/app/src/main/res/values/strings.xml': sampleStringsXML,
  };
  vol.fromJSON(directoryJSON, '/app');
});

afterAll(async () => {
  vol.reset();
});

it(`can write the escaped name and then read it back in unescaped format`, async () => {
  const stringsPath = '/app/android/app/src/main/res/values/strings.xml';
  let stringsJSON = await readResourcesXMLAsync({ path: stringsPath });
  expect(stringsJSON.resources.string.filter(e => e.$.name === 'app_name')[0]._).toBe(
    `expo &bo<y>'`
  );
  stringsJSON = setStringItem(
    [buildResourceItem({ name: 'app_name', value: `'E&x<p>o"@\n` })],
    stringsJSON
  );

  // Test that it's written in escaped form
  // expect(format(stringsJSON)).toBe(true);
  expect(format(stringsJSON).includes(`\\'E&amp;x&lt;p&gt;o\\\"\\@\\n`)).toBe(true);

  // And parsed in unescaped form
  expect(stringsJSON.resources.string.filter(e => e.$.name === 'app_name')[0]._).toBe(
    `\\'E&x<p>o\\\"\\@\\n`
  );
});
describe(escapeAndroidString, () => {
  it(`can escape Android strings`, () => {
    expect(escapeAndroidString(`@`)).toBe(`\\@`);
    expect(escapeAndroidString(`'''`)).toBe(`\\'\\'\\'`);
    expect(escapeAndroidString('"E&x<p>o"@\n\r\t')).toBe(`\\"E&x<p>o\\"\\@\\n\\r\\t`);
  });
});
