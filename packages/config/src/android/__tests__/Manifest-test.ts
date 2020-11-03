import { resolve } from 'path';

import {
  addMetaDataItemToMainApplication,
  addUsesLibraryItemToMainApplication,
  findMetaDataItem,
  findUsesLibraryItem,
  getMainActivity,
  getMainApplication,
  prefixAndroidKeys,
  readAndroidManifestAsync,
  removeMetaDataItemFromMainApplication,
  removeUsesLibraryItemFromMainApplication,
} from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe(getMainActivity, () => {
  it(`works`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    const activity = getMainActivity(manifest);
    expect(activity.$).toBeDefined();
    expect(Array.isArray(activity['intent-filter'])).toBe(true);
  });
  it(`returns null`, async () => {
    const activity = getMainActivity({} as any);
    expect(activity).toBe(null);
  });
});
describe(getMainApplication, () => {
  it(`works`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    const app = getMainApplication(manifest);
    expect(app.$).toBeDefined();
    expect(app.activity).toBeDefined();
  });
  it(`returns null`, async () => {
    const app = getMainApplication({} as any);
    expect(app).toBe(null);
  });
});
describe(addMetaDataItemToMainApplication, () => {
  it(`adds then removes meta-data item`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    const app = getMainApplication(manifest);
    addMetaDataItemToMainApplication(app, 'bacon', 'pancake');
    expect(findMetaDataItem(app, 'bacon')).toBe(0);
    removeMetaDataItemFromMainApplication(app, 'bacon');
    expect(findMetaDataItem(app, 'bacon')).toBe(-1);
  });
});
describe(addUsesLibraryItemToMainApplication, () => {
  it(`adds then removes uses-library item`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    const app = getMainApplication(manifest);
    addUsesLibraryItemToMainApplication(app, { name: 'bacon', required: true });
    expect(findUsesLibraryItem(app, 'bacon')).toBe(0);
    removeUsesLibraryItemFromMainApplication(app, 'bacon');
    expect(findUsesLibraryItem(app, 'bacon')).toBe(-1);
  });
});
describe(prefixAndroidKeys, () => {
  it(`adds android: prefix to all keys in an object`, () => {
    expect(prefixAndroidKeys({ bacon: 'pancake', required: true })).toStrictEqual({
      'android:bacon': 'pancake',
      'android:required': true,
    });
  });
});
