import Dot from 'dot-object';
import Metatags from './Metatags';

const delimiter = ':';
const dot = new Dot(delimiter);

function getMetaArrayFromObject(obj, format, prefix) {
  const output = dot.dot(obj);
  let parsed = [];
  for (const key of Object.keys(output)) {
    let components = key.split(delimiter);
    if (prefix != null) {
      components.unshift(prefix);
    }
    if (components[components.length - 1] === 'default') {
      components.pop();
    }
    if (format != null) {
      components = components.map(input => withFormat(input, format));
    }
    parsed.push({ property: components.join(delimiter), content: output[key] });
  }
  return parsed;
}

function withFormat(input, format) {
  switch (format) {
    case '-':
      return pascalToKebab(input);
    case '_':
      return pascalToSnake(input);
  }
  return input;
}

function pascalToSnake(pascalValue) {
  // https://stackoverflow.com/a/30521308/4047926
  return pascalValue
    .replace(/(?:^|\.?)([A-Z])/g, (searchValue, replaceValue) => '_' + replaceValue.toLowerCase())
    .replace(/^_/, '');
}

function pascalToKebab(pascalValue) {
  return pascalValue
    .replace(/(?:^|\.?)([A-Z])/g, (searchValue, replaceValue) => '-' + replaceValue.toLowerCase())
    .replace(/^-/, '');
}

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
    'apple-mobile-web-app-status-bar-style': apple.barStyle,
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
