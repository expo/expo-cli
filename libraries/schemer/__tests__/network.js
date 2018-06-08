import Schemer from '../src/index';

const schema = require('./files/schema.json').schema;
const S = new Schemer(schema, { rootDir: './__tests__' });

describe('Remote', () => {
  it('Icon', async () => {
    await expect(
      S.validateIcon(
        'https://upload.wikimedia.org/wikipedia/commons/0/0f/Icon_Pinguin_2_512x512.png'
      )
    ).resolves;
  });

  it('Remote icon dimensions correct', async () => {
    const S = new Schemer({
      properties: {
        icon: {
          meta: { asset: true, dimensions: { width: 100, height: 100 } },
        },
      },
    });
    await expect(S.validateIcon('https://httpbin.org/image/png')).resolves;
  });

  it('Remote icon dimensions wrong', async () => {
    const S = new Schemer(
      {
        properties: {
          icon: {
            meta: { asset: true, dimensions: { width: 101, height: 100 } },
          },
        },
      },
      { rootDir: './__tests__' }
    );
    try {
      await S.validateIcon('https://httpbin.org/image/png');
    } catch (e) {
      expect(e).toBeTruthy();
      expect(e.errors.length).toBe(1);
    }
  });
});
