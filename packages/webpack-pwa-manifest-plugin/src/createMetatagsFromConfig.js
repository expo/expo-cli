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
  const {
    googleSiteVerification,
    themeColor,
    twitter = {},
    facebook = {},
    microsoft = {},
    metatags = {},
  } = web;

  const openGraphMetatags = populateMetatagObject(Metatags.openGraph, facebook);
  const twitterMetatags = populateMetatagObject(Metatags.twitter, twitter);
  const microsoftMetatags = populateMetatagObject(Metatags.microsoft, microsoft);

  const appleMetatags = {
    'format-detection': 'telephone=no',
    'apple-touch-fullscreen': 'yes',
  };

  const metaTags = {
    viewport: web.viewport,
    description: config.description,
    'mobile-web-app-capable': 'yes',
    ...openGraphMetatags,
    ...microsoftMetatags,
    ...twitterMetatags,
    ...appleMetatags,
    ...metatags,
  };

  if (googleSiteVerification !== undefined) {
    metaTags['google-site-verification'] = googleSiteVerification;
  }

  if (themeColor !== undefined) {
    metaTags['theme-color'] = themeColor;
  }
  return metaTags;
}
