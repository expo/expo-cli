import { resolve } from 'path';

import { getMainApplication, readAndroidManifestAsync } from '../Manifest';
import { addOrRemoveMetaDataItemInArray, setMetaDataXML } from '../MetaData';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('metadata', () => {
  describe('setMetaDataXML', () => {
    it(`converts the metadata object into XML meta-data tags`, async () => {
      let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
      androidManifestJson = await setMetaDataXML(
        {
          android: {
            metadata: {
              foo: { value: true },
              bar: { value: false },
              nullish: { value: null },
              strval: { value: 'str' },
            },
          },
        },
        androidManifestJson
      );
      const mainApplication = getMainApplication(androidManifestJson);
      const metadata = mainApplication['meta-data'].map(e => e['$']);
      expect(metadata).toStrictEqual([
        { 'android:name': 'foo', 'android:value': true },
        { 'android:name': 'bar', 'android:value': false },
        { 'android:name': 'nullish', 'android:value': null },
        { 'android:name': 'strval', 'android:value': 'str' },
      ]);
    });
  });

  describe('addOrRemoveMetaDataItemInArray', () => {
    it(`allows overriding the value for modification`, () => {
      expect(
        addOrRemoveMetaDataItemInArray({}, { name: 'foo', value: 'bar' }, false)
      ).toStrictEqual({});
      // can be used to add/subtract a meta item even if the value is truthy.
      expect(addOrRemoveMetaDataItemInArray({}, { name: 'foo', value: 'bar' }, true)).toStrictEqual(
        {
          foo: { value: 'bar' },
        }
      );
    });
    it(`skips a falsey value`, () => {
      expect(addOrRemoveMetaDataItemInArray({}, { name: 'foo', value: null })).toStrictEqual({});
    });
    it(`adds a truthy value to a metadata object`, () => {
      expect(addOrRemoveMetaDataItemInArray({}, { name: 'foo', value: 'bar' })).toStrictEqual({
        foo: { value: 'bar' },
      });
    });
    it(`serializes a boolean value`, () => {
      expect(addOrRemoveMetaDataItemInArray({}, { name: 'foo', value: false })).toStrictEqual({
        foo: { value: 'false' },
      });
    });
  });
});
