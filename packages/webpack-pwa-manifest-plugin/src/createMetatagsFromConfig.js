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
    'mobile-web-app-capable': apple.mobileWebAppCapable,
    'apple-mobile-web-app-capable': apple.mobileWebAppCapable,
    'apple-mobile-web-app-status-bar-style': apple.barStyle,
    'apple-mobile-web-app-title': web.shortName,
  };

  const metaTags = {
    viewport,
    description: config.description,
    ...openGraphMetatags,
    ...microsoftMetatags,
    ...twitterMetatags,
    ...appleMetatags,
  };

  if (googleSiteVerification !== undefined) {
    metaTags['google-site-verification'] = googleSiteVerification;
  }

  if (themeColor !== undefined) {
    metaTags['theme-color'] = themeColor;
  }
  return metaTags;
}
