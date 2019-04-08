const Metatags = require('./Metatags');

/**
 * To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
 */
const DEFAULT_VIEWPORT = 'width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover';

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

function createMetatagsFromConfig(config) {
  const { web = {} } = config;
  const {
    googleSiteVerification,
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
    viewport: DEFAULT_VIEWPORT,
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
  return metaTags;
}

module.exports = createMetatagsFromConfig;
