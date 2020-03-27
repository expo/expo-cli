import {
  getFacebookAdvertiserIDCollection,
  getFacebookAppId,
  getFacebookAutoInitEnabled,
  getFacebookAutoLogAppEvents,
  getFacebookDisplayName,
  getFacebookScheme,
  setFacebookAdvertiserIDCollectionEnabled,
  setFacebookAppId,
  setFacebookApplicationQuerySchemes,
  setFacebookAutoInitEnabled,
  setFacebookAutoLogAppEventsEnabled,
  setFacebookConfig,
  setFacebookDisplayName,
} from '../Facebook';

describe('iOS facebook config', () => {
  it(`returns null from all getters if no value provided`, () => {
    expect(getFacebookScheme({})).toBe(null);
    expect(getFacebookAppId({})).toBe(null);
    expect(getFacebookDisplayName({})).toBe(null);
    expect(getFacebookAutoLogAppEvents({})).toBe(null);
    expect(getFacebookAutoInitEnabled({})).toBe(null);
    expect(getFacebookAdvertiserIDCollection({})).toBe(null);
  });

  it(`returns correct value from all getters if value provided`, () => {
    expect(getFacebookScheme({ facebookScheme: 'myscheme' })).toMatch('myscheme');
    expect(getFacebookAppId({ facebookAppId: 'my-app-id' })).toMatch('my-app-id');
    expect(getFacebookDisplayName({ facebookDisplayName: 'my-display-name' })).toMatch(
      'my-display-name'
    );
    expect(getFacebookAutoLogAppEvents({ facebookAutoLogAppEventsEnabled: false })).toBe(false);
    expect(getFacebookAutoInitEnabled({ facebookAutoInitEnabled: true })).toBe(true);
    expect(
      getFacebookAdvertiserIDCollection({ facebookAdvertiserIDCollectionEnabled: false })
    ).toBe(false);
  });

  it('sets the facebook app id config', () => {
    expect(setFacebookAppId({ facebookAppId: 'abc' }, {})).toMatchObject({
      FacebookAppID: 'abc',
    });
  });

  it('sets the facebook auto init config', () => {
    expect(setFacebookAutoInitEnabled({ facebookAutoInitEnabled: true }, {})).toMatchObject({
      FacebookAutoInitEnabled: true,
    });
  });

  it('sets the facebook advertising id enabled config', () => {
    expect(
      setFacebookAdvertiserIDCollectionEnabled({ facebookAdvertiserIDCollectionEnabled: true }, {})
    ).toMatchObject({
      FacebookAdvertiserIDCollectionEnabled: true,
    });
  });
});
