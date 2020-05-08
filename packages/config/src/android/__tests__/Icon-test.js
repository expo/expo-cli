import { createAdaptiveIconXmlString, getAdaptiveIcon, getIcon } from '../Icon';

const ADAPTIVE_ICON_XML_WITH_BOTH = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
const ADAPTIVE_ICON_XML_WITH_BACKGROUND_COLOR = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

describe('Android Icon', () => {
  it(`returns null if no icon values provided`, () => {
    expect(getIcon({})).toBeNull();
    expect(getAdaptiveIcon({})).toMatchObject({
      foregroundImage: null,
      backgroundColor: '#FFFFFF',
      backgroundImage: null,
    });
  });

  it(`returns adaptive icon over android icon`, () => {
    const config = {
      icon: 'icon',
      android: {
        icon: 'androidIcon',
        adaptiveIcon: {
          foregroundImage: 'adaptiveIcon',
          backgroundImage: 'backgroundImage',
          backgroundColor: '#000000',
        },
      },
    };
    const { foregroundImage, backgroundColor, backgroundImage } = getAdaptiveIcon(config);
    const icon = foregroundImage || getIcon(config);
    expect(icon).toMatch('adaptiveIcon');
    expect(backgroundColor).toMatch('#000000');
    expect(backgroundImage).toMatch('backgroundImage');
  });

  it(`creates the proper AdaptiveIconXmlString`, () => {
    let withBackgroundImage = createAdaptiveIconXmlString(null, 'path/to/image');
    let withBackgroundColor = createAdaptiveIconXmlString('#123456', null);
    let withBoth = createAdaptiveIconXmlString('#123456', 'path/to/image');

    expect(withBackgroundColor).toMatch(ADAPTIVE_ICON_XML_WITH_BACKGROUND_COLOR);
    expect(withBackgroundImage).toMatch(ADAPTIVE_ICON_XML_WITH_BOTH);
    expect(withBoth).toMatch(ADAPTIVE_ICON_XML_WITH_BOTH);
  });
});
