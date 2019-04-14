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

// Create `manifest.json`
function writeManifestToFile(manifest, options, publicPath, icons) {
  const content = { ...manifest, icons };

  if (content.orientation === 'omit') {
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
    let parsedIconsResult = {};
    if (!self.options.noResources) {
      const [results, config] = retrieveIcons(self.manifest);
      self.manifest = config;
      parsedIconsResult = await parseIcons(results, self.options.fingerprints, publicPath);
    }

    const { icons = {}, assets = [] } = parsedIconsResult;
    const results = writeManifestToFile(self.manifest, self.options, publicPath, icons);
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

export function generateAppleTags(manifest, assets) {
  let tags = {};
  if (manifest.ios) {
    let apple = {
      'apple-mobile-web-app-title': 'Expo PWA',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
    };
    if (typeof manifest.ios === 'object') {
      apple = {
        ...apple,
        ...manifest.ios,
      };
    }

    for (let tag in apple) {
      const type = appleTags[tag];
      if (type) {
        tags = applyTag(tags, type, formatAppleTag(tag, apple[tag]));
      }
    }
    if (assets) {
      for (let asset of assets) {
        if (asset.ios && asset.ios.valid) {
          if (asset.ios.valid === 'startup') {
            tags = applyTag(tags, 'link', {
              rel: 'apple-touch-startup-image',
              media: asset.ios.media,
              href: asset.ios.href,
            });
          } else {
            tags = applyTag(tags, 'link', {
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
    tags = applyTag(
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
  if (!content) {
    return obj;
  }
  const tags = { ...obj };
  if (tags[tag]) {
    if (Array.isArray(tags[tag])) {
      tags[tag].push(content);
      return tags;
    }
    tags[tag] = [tags[tag], content];
    return tags;
  }

  tags[tag] = content;
  return tags;
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
