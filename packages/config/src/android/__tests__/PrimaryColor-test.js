import { fs, vol } from 'memfs';
import { getPrimaryColor, setPrimaryColor } from '../PrimaryColor';
import { readStylesXMLAsync } from '../Styles';
import { readColorsXMLAsync } from '../Colors';
import { sampleStylesXML } from './StatusBar-test';
jest.mock('fs');

describe('Android primary color', () => {
  it(`returns default if no primary color is provided`, () => {
    expect(getPrimaryColor({})).toBe('#023c69');
  });

  it(`returns primary color if provided`, () => {
    expect(getPrimaryColor({ primaryColor: '#111111' })).toMatch('#111111');
  });

  describe('E2E: write primary color to colors.xml and styles.xml correctly', () => {
    beforeAll(async () => {
      const directoryJSON = {
        './android/app/src/main/res/values/styles.xml': sampleStylesXML,
      };
      vol.fromJSON(directoryJSON, '/app');
    });

    afterAll(async () => {
      vol.reset();
    });

    it(`sets the colorPrimary item in Styles.xml if backgroundColor is given`, async () => {
      expect(await setPrimaryColor({ primaryColor: '#654321' }, '/app')).toBe(true);

      let stylesJSON = await readStylesXMLAsync('/app/android/app/src/main/res/values/styles.xml');
      let colorsJSON = await readColorsXMLAsync('/app/android/app/src/main/res/values/colors.xml');

      expect(
        stylesJSON.resources.style
          .filter(e => e['$']['name'] === 'AppTheme')[0]
          .item.filter(item => item['$'].name === 'colorPrimary')[0]['_']
      ).toMatch('@color/colorPrimary');
      expect(
        colorsJSON.resources.color.filter(e => e['$']['name'] === 'colorPrimary')[0]['_']
      ).toMatch('#654321');
    });
  });
});
