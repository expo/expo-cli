import {
  getRootViewBackgroundColor,
  setRootViewBackgroundColorColors,
  setRootViewBackgroundColorStyles,
} from '../RootViewBackgroundColor';

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
  it(`sets the android:windowBackground in styles.xml if backgroundColor is given`, async () => {
    const config = { backgroundColor: '#654321' };
    const props = {
      hexString: getRootViewBackgroundColor(config),
    };
    const styles = setRootViewBackgroundColorStyles(props, { resources: {} });
    const colors = setRootViewBackgroundColorColors(props, { resources: {} });
    expect(
      styles.resources.style
        .filter(e => e.$.name === 'AppTheme')[0]
        .item.filter(item => item.$.name === 'android:windowBackground')[0]._
    ).toMatch('@color/activityBackground');
    expect(colors.resources.color.filter(e => e.$.name === 'activityBackground')[0]._).toMatch(
      '#654321'
    );
  });
});
