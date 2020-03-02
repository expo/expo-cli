import { Cacher } from '../../tools/FsCache';

jest.mock('analytics-node');

const fs = require('fs-extra');
const path = require('path');

describe('Cacher', () => {
  it('works without a bootstrap file', async () => {
    const dateCacher = new Cacher(
      async () => {
        return new Date();
      },
      'dateslol',
      1000
    );

    try {
      await dateCacher.clearAsync();
    } catch (e) {
      // this is ok
    }

    const date1 = new Date(await dateCacher.getAsync());

    // should be well within the TTL, should be identical value
    expect(date1).toEqual(new Date(await dateCacher.getAsync()));

    // should be outside of the TTL -- just making sure that sufficient delay will change the value
    setTimeout(() => {
      dateCacher.getAsync().then(d => {
        expect(date1).not.toEqual(new Date(d));
      });
    }, 3000);
  });

  xit('works with a bootstrap file', async () => {
    const expected = JSON.parse(await fs.readFile(path.join(__dirname, '@expo/xdl/package.json')));

    const failCacher = new Cacher(
      () => {
        throw new Error('lol this never succeeds');
      },
      'bootstrap',
      1000,
      path.join(__dirname, '@expo/xdl/package.json')
    );

    // since we don't mock the fs here (.cache is transient), need to make sure it's empty
    try {
      await failCacher.clearAsync();
    } catch (e) {
      // noop
    }

    const found = await failCacher.getAsync();

    expect(found).toEqual(expected);
  });
});
