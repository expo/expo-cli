import { fs, vol } from 'memfs';
import { getRootViewBackgroundColor, setRootViewBackgroundColor } from '../RootViewBackgroundColor';
import { readStylesXMLAsync } from '../Styles';
import { readColorsXMLAsync } from '../Colors';
import { sampleStylesXML } from './StatusBar-test';
jest.mock('fs');

describe('Root view background color', () => {
  it(`returns null if no backgroundColor is provided`, () => {
    expect(getRootViewBackgroundColor({})).toBe(null);
  });

  it(`returns backgroundColor if provided`, () => {
    expect(getRootViewBackgroundColor({ backgroundColor: '#111111' })).toMatch('#111111');
  });

  it(`returns the backgroundColor under android if provided`, () => {
    expect(
      getRootViewBackgroundColor({
        backgroundColor: '#111111',
        android: { backgroundColor: '#222222' },
      })
    ).toMatch('#222222');
  });

  describe('write colors.xml correctly', () => {
    beforeAll(async () => {
      const directoryJSON = {
        './android/app/src/main/res/values/styles.xml': sampleStylesXML,
      };
      vol.fromJSON(directoryJSON, '/app');
    });

    afterAll(async () => {
      vol.reset();
    });

    it(`sets the android:windowBackground in Styles.xml if backgroundColor is given`, async () => {
      expect(await setRootViewBackgroundColor({ backgroundColor: '#654321' }, '/app')).toBe(true);

      let stylesJSON = await readStylesXMLAsync('/app/android/app/src/main/res/values/styles.xml');
      let colorsJSON = await readColorsXMLAsync('/app/android/app/src/main/res/values/colors.xml');

      expect(
        stylesJSON.resources.style
          .filter(e => e['$']['name'] === 'AppTheme')[0]
          .item.filter(item => item['$'].name === 'android:windowBackground')[0]['_']
      ).toMatch('@color/activityBackground');
      expect(
        colorsJSON.resources.color.filter(e => e['$']['name'] === 'activityBackground')[0]['_']
      ).toMatch('#654321');
    });
  });
});
