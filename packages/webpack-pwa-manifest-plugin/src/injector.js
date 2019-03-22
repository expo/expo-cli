import path from 'path';
import generateFingerprint from './helpers/fingerprint';
import { joinURI } from './helpers/uri';
import { retrieveIcons, parseIcons } from './icons';
import except from './helpers/except';

const voidTags = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'menuitem',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
];

const appleTags = {
  'apple-touch-icon': 'link',
  'apple-touch-startup-image': 'link',
  'apple-mobile-web-app-title': 'meta',
  'apple-mobile-web-app-capable': 'meta',
  'apple-mobile-web-app-status-bar-style': 'meta',
};

function createFilename(filenameTemplate, json, shouldFingerprint) {
  const formatters = [
    {
      pattern: /\[hash(:([1-9]|[1-2][0-9]|3[0-2]))?\]/gi,
      value: (match, limit = ':32') => {
        if (!shouldFingerprint) return '';
        const hash = generateFingerprint(json);
        return hash.substr(0, parseInt(limit.substr(1), 10));
      },
    },
    {
      pattern: /\[ext\]/gi,
      value: 'json',
    },
    {
      pattern: /\[name\]/gi,
      value: 'manifest',
    },
  ];

  return formatters.reduce((acc, curr) => acc.replace(curr.pattern, curr.value), filenameTemplate);
}

function manifest(options, publicPath, icons, callback) {
  const content = except(Object.assign({ icons }, options), [
    'filename',
    'inject',
    'fingerprints',
    'ios',
    'publicPath',
    'icon',
    'useWebpackPublicPath',
    'includeDirectory',
    'crossorigin',
  ]);
  if (options.orientation === 'omit') {
    delete content.orientation;
  }
  const json = JSON.stringify(content, null, 2);
  const file = path.parse(options.filename);
  const filename = createFilename(file.base, json, options.fingerprints);
  const output = options.includeDirectory ? path.join(file.dir, filename) : filename;
  return {
    output,
    url: joinURI(publicPath, output),
    source: json,
    size: json.length,
  };
}

export async function buildResources(self, publicPath = '') {
  if (!self.assets || !self.options.inject) {
    publicPath = publicPath || '';
    const parsedIconsResult = await parseIcons(
      self.options.fingerprints,
      publicPath,
      retrieveIcons(self.options)
    );

    const { icons, assets = [] } = parsedIconsResult;
    const results = manifest(self.options, publicPath, icons);
    self.manifest = results;
    self.assets = [results, ...assets];
  }
}

export function injectResources(compilation, assets, callback) {
  if (assets) {
    for (let asset of assets) {
      compilation.assets[asset.output] = {
        source: () => asset.source,
        size: () => asset.size,
      };
    }
  }
  callback();
}

export function generateAppleTags(options, assets) {
  let tags = {};
  if (options.ios) {
    let apple = {
      'apple-mobile-web-app-title': options.name,
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
    };
    if (typeof options.ios === 'object') {
      apple = {
        ...apple,
        ...options.ios,
      };
    }

    for (let tag in apple) {
      const type = appleTags[tag];
      if (!type) continue; // not a valid apple tag
      applyTag(tags, type, formatAppleTag(tag, apple[tag]));
    }
    if (assets) {
      for (let asset of assets) {
        if (asset.ios && asset.ios.valid) {
          if (asset.ios.valid === 'startup') {
            applyTag(tags, 'link', {
              rel: 'apple-touch-startup-image',
              media: asset.ios.media,
              href: asset.ios.href,
            });
          } else {
            applyTag(tags, 'link', {
              // apple-touch-icon-precomposed
              rel: 'apple-touch-icon',
              sizes: asset.ios.size,
              href: asset.ios.href,
            });
          }
        }
      }
    }
  }
  return tags;
}

export function generateMaskIconLink(tags, assets) {
  const svgAsset = assets.find(asset => /[^.]+$/.exec(asset.output)[0] === 'svg');
  if (svgAsset) {
    applyTag(
      tags,
      'link',
      Object.assign(
        {
          rel: 'mask-icon',
          href: svgAsset.url,
        },
        !!svgAsset.color && { color: svgAsset.color }
      )
    );
  }
  return tags;
}

function formatAppleTag(tag, content) {
  if (tag === 'apple-touch-icon') {
    if (typeof content === 'string') {
      return {
        rel: tag,
        href: content,
      };
    } else {
      let sizes = content.sizes;
      sizes = +sizes || parseInt(sizes);
      return isNaN(sizes)
        ? {
            rel: tag,
            href: content.href,
          }
        : {
            rel: tag,
            sizes,
            href: content.href,
          };
    }
  } else if (tag === 'apple-touch-startup-image') {
    return {
      rel: tag,
      href: content,
    };
  } else if (tag === 'apple-mobile-web-app-title') {
    return {
      name: tag,
      content,
    };
  } else if (tag === 'apple-mobile-web-app-capable') {
    let value = content;
    if (typeof content === 'boolean' || typeof content === 'number') value = content ? 'yes' : 'no';
    return {
      name: tag,
      content: value,
    };
  } else if (tag === 'apple-mobile-web-app-status-bar-style') {
    return {
      name: tag,
      content,
    };
  }
  return null;
}

export function applyTag(obj, tag, content) {
  if (!content) return obj;
  if (obj[tag]) {
    if (Array.isArray(obj[tag])) {
      obj[tag].push(content);
    } else {
      obj[tag] = [obj[tag], content];
    }
  } else {
    obj[tag] = content;
  }
  return obj;
}

export function generateHtmlTags(tags) {
  let html = '';
  for (let tag in tags) {
    const attrs = tags[tag];
    if (Array.isArray(attrs)) {
      for (let a of attrs) {
        html = `${html}${generateHtmlTags({
          [tag]: a,
        })}`;
      }
    } else {
      html = `${html}<${tag}`;
      for (let attr in attrs) {
        html = `${html} ${attr}="${attrs[attr]}"`;
      }
      html = voidTags.indexOf(tag) === -1 ? `${html}></${tag}>` : `${html} />`;
    }
  }
  return html;
}
