import Metatags from './Metatags';

function possibleProperty(input, possiblePropertyNames, fallback) {
  for (const propertyName of possiblePropertyNames) {
    if (input[propertyName] !== undefined) {
      return input[propertyName];
    }
  }
  return fallback;
}

function populateMetatagObject(schema, input) {
  let output = {};
  for (const item of schema) {
    // Check the list of propNames and the tag name
    const value = possibleProperty(input, item.propNames.concat([item.name]), item.fallback);
    if (value !== undefined) {
      output[item.name] = value;
    }
  }
  return output;
}

export default function createMetatagsFromConfig(config) {
  const { web = {} } = config || config.expo || {};
  const { themeColor, meta = {} } = web;
  const {
    viewport,
    googleSiteVerification,
    apple = {},
    android = {},
    twitter = {},
    openGraph = {},
    microsoft = {},
  } = meta;

  const openGraphMetatags = populateMetatagObject(Metatags.openGraph, openGraph);
  const twitterMetatags = populateMetatagObject(Metatags.twitter, twitter);
  const microsoftMetatags = populateMetatagObject(Metatags.microsoft, microsoft);

  const appleMetatags = {
    // Disable automatic phone number detection.
    'format-detection': apple.formatDetection,
    'apple-touch-fullscreen': apple.touchFullscreen,
    'apple-mobile-web-app-capable': apple.mobileWebAppCapable,
    'apple-mobile-web-app-status-bar-style': apple.barStyle,
    'apple-mobile-web-app-title': web.shortName,
  };

  const androidMetatags = {
    // [Android Chrome] To enable multi-resolution icons of size [196x196]
    'mobile-web-app-capable': android.mobileWebAppCapable || apple.mobileWebAppCapable,
  };

  const metaTags = {
    viewport,
    description: config.description,
    ...openGraphMetatags,
    ...microsoftMetatags,
    ...twitterMetatags,
    ...appleMetatags,
    ...androidMetatags,
  };

  if (googleSiteVerification !== undefined) {
    metaTags['google-site-verification'] = googleSiteVerification;
  }

  if (themeColor !== undefined) {
    metaTags['theme-color'] = themeColor;
  }
  return metaTags;
}
