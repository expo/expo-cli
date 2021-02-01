import { vol } from 'memfs';

import { getProjectColorsXMLPathAsync, removeColorItem, setColorItem } from '../Colors';
import { buildResourceItem, readResourcesXMLAsync } from '../Resources';

jest.mock('fs');

describe(setColorItem, () => {
  beforeAll(async () => {
    const directoryJSON = {
      './android/app/src/main/res/values/colors.xml': '<resources></resources>',
    };
    vol.fromJSON(directoryJSON, '/app');
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`gets different themed colors`, async () => {
    const path = await getProjectColorsXMLPathAsync('/app', { kind: 'values-night' });
    expect(path).toBe('/app/android/app/src/main/res/values-night/colors.xml');
  });
  it(`modifies the colors file`, async () => {
    const path = await getProjectColorsXMLPathAsync('/app');
    expect(path).toBe('/app/android/app/src/main/res/values/colors.xml');
    // read the colors object
    let colors = await readResourcesXMLAsync({ path });
    expect(colors).toStrictEqual({ resources: {} });

    const colorItemToAdd = buildResourceItem({ name: 'somn', value: '#fff000' });

    // Add a color item
    colors = setColorItem(colorItemToAdd, colors);
    // check the object
    expect(colors).toStrictEqual({ resources: { color: [colorItemToAdd] } });
    // change the color
    colorItemToAdd._ = '#000000';
    // reassign the color
    colors = setColorItem(colorItemToAdd, colors);
    // check the object is reassigned
    expect(colors.resources.color[0]._).toBe('#000000');
    // ensure an extra color was not added
    expect(colors.resources.color.length).toBe(1);
    // Remove the color item
    colors = removeColorItem('somn', colors);
    // doesn't fully reset the colors.
    expect(colors).toStrictEqual({ resources: { color: [] } });
  });
});
