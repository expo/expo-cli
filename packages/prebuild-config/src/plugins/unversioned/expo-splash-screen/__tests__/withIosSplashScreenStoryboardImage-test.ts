import { toString } from '../InterfaceBuilder';
import { getTemplateAsync } from '../withIosSplashScreenStoryboard';
import { applySplashScreenStoryboard } from '../wtihIosSplashScreenStoryboardImage';

describe(applySplashScreenStoryboard, () => {
  it(`gets a splash screen without options`, async () => {
    const xml = await getTemplateAsync();

    const contents = await applySplashScreenStoryboard(xml, {
      image: 'splash.png',
      backgroundColor: '#ff00ff',
      resizeMode: 'cover',
      tabletImage: null,
      tabletBackgroundColor: null,
    });
    expect(toString(contents)).not.toMatch(/contentMode="scaleAspectFit"/);
  });
  // it(`gets a splash screen with image and resize`, async () => {
  //   const contents = await getSplashStoryboardContentsAsync({
  //     image: './my-image.png',
  //     resizeMode: 'contain',
  //   });
  //   // Test the splash screen XML
  //   expect(contents).toMatch(/contentMode="scaleAspectFit"/);
  //   expect(contents).toMatch(/id="EXPO-SplashScreen"/);
  // });
});
