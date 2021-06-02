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
  const config = { backgroundColor: '#654321' };
  it(`sets the windowBackground in colors.xml if backgroundColor is given`, async () => {
    const colors = setRootViewBackgroundColorColors(config, { resources: {} });
    expect(
      colors.resources.color.filter(({ $: head }) => head.name === 'activityBackground')[0]._
    ).toMatch('#654321');
  });
  it(`sets the android:windowBackground in styles.xml if backgroundColor is given`, async () => {
    const styles = setRootViewBackgroundColorStyles(config, { resources: {} });
    expect(
      styles.resources.style
        .filter(({ $: head }) => head.name === 'AppTheme')[0]
        .item.filter(({ $: head }) => head.name === 'android:windowBackground')[0]._
    ).toMatch('@color/activityBackground');
  });
});
