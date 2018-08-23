import renderIntentFilters from '../../detach/AndroidIntentFilters';

function normalizeWhitespace(intentFiltersRendering) {
  return intentFiltersRendering.map(intentFilter => intentFilter.replace(/>\s+</g, '>\n<'));
}

describe('renderIntentFilters', () => {
  it('renders intent filters', () => {
    const intentFilters = [
      {
        'data': { 'scheme': 'https' },
        'action': 'VIEW',
        'category': 'DEFAULT',
      },
      {
        'autoVerify': true,
        'data': [
          { 'scheme': 'http', 'host': 'exp.host', 'pathPrefix': '/@', 'mimeType': 'image/jpeg' },
          { 'scheme': 'https', 'port': '443', 'pathPattern': '.*' },
        ],
        'action': 'WEB_SEARCH',
        'category': ['DEFAULT', 'BROWSABLE']
      }
    ];
    expect(normalizeWhitespace(renderIntentFilters(intentFilters)))
      .toEqual(normalizeWhitespace([
        `<intent-filter>
          <data android:scheme="https"/>
          <action android:name="android.intent.action.VIEW"/>
          <category android:name="android.intent.category.DEFAULT"/>
        </intent-filter>`,
        `<intent-filter android:autoVerify="true">
          <data android:scheme="http" android:host="exp.host" android:pathPrefix="/@" android:mimeType="image/jpeg"/>
          <data android:scheme="https" android:port="443" android:pathPattern=".*"/>
          <action android:name="android.intent.action.WEB_SEARCH"/>
          <category android:name="android.intent.category.DEFAULT"/>
          <category android:name="android.intent.category.BROWSABLE"/>
        </intent-filter>`,
      ]));
  });
});
