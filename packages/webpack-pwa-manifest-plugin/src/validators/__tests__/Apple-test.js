import { fromStartupImage } from '../Apple';

it(`returns expected shape`, () => {
  const color = 'red';
  const resizeMode = 'contain';
  const imageData = fromStartupImage({ src: 'icon.png', resizeMode, color });

  for (const image of imageData) {
    expect(image.color).toBe(color);
    expect(image.destination).not.toBeDefined();
    expect(image.ios).toBe('startup');
    expect(image.resizeMode).toBe(resizeMode);
    expect(typeof image.scale).toBe('number');
    expect(Array.isArray(image.sizes)).toBe(true);
    for (const size of image.sizes) {
      expect(Array.isArray(size)).toBe(true);
    }
    expect(image.media).toMatch(
      /(?=.*screen)(?=.*device-width)(?=.*device-height)(?=.*webkit-device-pixel-ratio)(?=.*orientation)/
    );
  }
});
