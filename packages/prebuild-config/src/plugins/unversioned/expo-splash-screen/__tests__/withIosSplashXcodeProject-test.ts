import { getSplashStoryboardContentsAsync } from '../withIosSplashXcodeProject';

describe(getSplashStoryboardContentsAsync, () => {
  it(`gets a splash screen without options`, async () => {
    const contents = await getSplashStoryboardContentsAsync({});
    expect(contents).not.toMatch(/contentMode="scaleAspectFit"/);
  });
  it(`gets a splash screen with image and resize`, async () => {
    const contents = await getSplashStoryboardContentsAsync({
      image: './my-image.png',
      resizeMode: 'contain',
    });
    // Test the splash screen XML
    expect(contents).toMatch(/contentMode="scaleAspectFit"/);
    expect(contents).toMatch(/id="EXPO-SplashScreen"/);
  });
});
