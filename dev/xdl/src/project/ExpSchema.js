const joi = require('joi');
const colorField = joi.string().regex(/^#|(&#x23;)\d{6}$/).
  meta({regexHuman: "6 character long hex color string, eg: ``'#000000'``"});

const reverseDnsField = joi.string().regex(/^[a-zA-Z][a-zA-Z0-9\_\.]+$/).
  meta({regexHuman: "Reverse DNS notation unique name for your app. For example, host.exp.exponent, where exp.host is our domain and Exponent is our app."});

const pngField = joi.string().uri().regex(/\.png$/);

module.exports = joi.object().keys({
  name: joi.string().required().description(`
    The name of your app as it appears both within Exponent and on your home screen as a standalone app.
  `),
  description: joi.string().description(`
    A short description of what your app is and why it is great.
  `),
  slug: joi.string().regex(/^[a-zA-Z0-9\-]+$/).required().description(`
    The friendly url name for publishing. eg: \`\`exp.host/@your-username/slug\`\`.
  `),
  sdkVersion: joi.string().regex(/^(\d+\.\d+\.\d+)|(UNVERSIONED)$/).required().description(`
    The Exponent sdkVersion to run the project on. This should line up with the version specified in your package.json.
  `),
  version: joi.string().description(`
    Your app version, use whatever versioning scheme that you like.
  `),
  orientation: joi.any().valid('default', 'portrait', 'landscape').description(`
    Lock your app to a specific orientation with \`\`portrait\`\` or \`\`landscape\`\`. Defaults to no lock.
  `),
  primaryColor: colorField.description(`
    On Android, this will determine the color of your app in the multitasker. Currently this is not used on iOS, but it may be used for other purposes in the future.
  `),
  iconUrl: pngField.description(`
    A url that points to your app's icon image. We recommend that you use a 512x512 png file with transparency. This icon will appear on the home screen and within the Exponent app.
  `),
  notification: joi.object().keys({
    iconUrl: pngField.description(
      `Url that points to the icon to use for push notifications. 48x48 png grayscale with transparency.`
    ),
    color: colorField.description(
      `Tint color for the push notification image when it appears in the notification tray.`
    ),
    androidMode: joi.any().valid('default', 'collapse').description(
      "Show each push notification individually (``default``) or collapse into one (``collapse``)."
    ),
    androidCollapsedTitle: joi.string().description(
      "If ``androidMode`` is set to ``collapse``, this title is used for the collapsed notification message. eg: ``'#{unread_notifications} new interactions'``."
    ),
  }).description(`
    Configuration for remote (push) notifications.
  `),
  loading: joi.object().keys({
    iconUrl: pngField.uri().description(
      `Url that points to the icon to display while starting up the app. Image size and aspect ratio are up to you.`
    ),
    exponentIconColor: joi.any().valid('white', 'blue').description(
      "If no icon is provided, we will show the Exponent logo. You can choose between ``white`` and ``blue``."
    ),
    exponentIconGrayscale: joi.number().min(0).max(1).description(
      "Similar to ``exponentIconColor`` but instead indicate if it should be grayscale (``1``) or not (``0``)."
    ),
    backgroundImageUrl: pngField.uri().description(
      "Url that points to an image to fill the background of the loading screen. Image size and aspect ratio are up to you."
    ),
    backgroundColor: colorField.description(
      "Color to fill the loading screen background"
    ),
    hideExponentText: joi.boolean().description(
      "By default, Exponent shows some text at the bottom of the loading screen. Set this to ``true`` to disable."
    ),
  }).description(`
    Configuration for the loading screen that users see when opening your app, while fetching & caching bundle and assets.
  `),
  appKey: joi.string().description(
    "By default, Exponent looks for the application registered with the AppRegistry as ``main``. If you would like to change this, you can specify the name in this property."
  ),
  androidStatusBarColor: colorField,
  androidHideExponentNotificationInShellApp: joi.boolean().description(
    "By default, Exponent adds a notification to your app with refresh button and debug info. Set this to ``true`` to disable."
  ),
  scheme: joi.string().alphanum().description(
    "Url scheme to link into your app. For example, if we set this to ``'rnplay'``, then rnplay:// urls would open your app when tapped."
  ).meta({standaloneOnly: true}),

  entryPoint: joi.string().description(`
    The relative path to your main JavaScript file.
  `),

  extra: joi.object().description(`
    Any extra fields you want to pass to your experience.
  `),
  rnCliPath: joi.string(),
  packagerOpts: joi.object(),
  ignoreNodeModulesValidation: joi.boolean(),
  nodeModulesPath: joi.string(),

  ios: joi.object().keys({
    bundleIdentifier: reverseDnsField.description(
      "The bundle identifier for your iOS standalone app. You make it up, but it needs to be unique on the App Store. See `this StackOverflow question <http://stackoverflow.com/questions/11347470/what-does-bundle-identifier-mean-in-the-ios-project>`_."
    ),
  }).description('iOS standalone app specific configuration').meta({standaloneOnly: true}),
  android: joi.object().keys({
    package: reverseDnsField.description(
      "The package name for your Android standalone app. You make it up, but it needs to be unique on the Play Store. See `this StackOverflow question <http://stackoverflow.com/questions/6273892/android-package-name-convention>`_."
    ),
    versionCode: joi.number().description(
      "Version number required by Google Play. Increment by one for each release. https://developer.android.com/studio/publish/versioning.html."
    ),
    config: joi.object().keys({
      fabric: joi.object().keys({
        apiKey: joi.string().alphanum().description('Your Fabric API key'),
        buildSecret: joi.string().alphanum().description('Your Fabric build secret'),
      }).description(
        "`Twitter Fabric <https://get.fabric.io/>`_ keys to hook up Crashlytics and other services."
      ),
    }),
  }).description('Android standalone app specific configuration').meta({standaloneOnly: true}),
});
