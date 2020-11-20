import { vol } from 'memfs';

import { setFacebookAppIdString } from '../Facebook';
import { readResourcesXMLAsync } from '../Resources';

jest.mock('fs');

describe('writes Facebook app id to strings.xml correctly', () => {
  beforeAll(async () => {
    const directoryJSON = {
      './android/app/src/main/res/values/strings.xml': '<resources></resources>',
    };
    vol.fromJSON(directoryJSON, '/app');
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`sets the facebook_app_id item in strings.xml if facebookappid is given`, async () => {
    expect(await setFacebookAppIdString({ facebookAppId: 'my-app-id' }, '/app')).toBe(true);
    const stringsJSON = await readResourcesXMLAsync({
      path: '/app/android/app/src/main/res/values/strings.xml',
    });
    expect(stringsJSON.resources.string.filter(e => e.$.name === 'facebook_app_id')[0]._).toMatch(
      'my-app-id'
    );
  });
});
