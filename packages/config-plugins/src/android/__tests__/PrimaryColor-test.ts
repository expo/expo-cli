import { getPrimaryColor, setPrimaryColorColors, setPrimaryColorStyles } from '../PrimaryColor';

describe('Android primary color', () => {
  it(`returns default if no primary color is provided`, () => {
    expect(getPrimaryColor({})).toBe('#023c69');
  });

  it(`returns primary color if provided`, () => {
    expect(getPrimaryColor({ primaryColor: '#111111' })).toMatch('#111111');
  });

  describe('E2E: write primary color to colors.xml and styles.xml correctly', () => {
    it(`sets the colorPrimary item in Styles.xml if backgroundColor is given`, async () => {
      const config = { primaryColor: '#654321' };
      const colors = setPrimaryColorColors(config, { resources: {} });
      const styles = setPrimaryColorStyles(config, { resources: {} });

      expect(
        styles.resources.style
          .filter(e => e.$.name === 'AppTheme')[0]
          .item.filter(item => item.$.name === 'colorPrimary')[0]._
      ).toMatch('@color/colorPrimary');
      expect(colors.resources.color.filter(e => e.$.name === 'colorPrimary')[0]._).toMatch(
        '#654321'
      );
    });
  });
});
