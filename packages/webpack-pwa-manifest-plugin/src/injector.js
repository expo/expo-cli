import path from 'path';
import generateFingerprint from './helpers/fingerprint';
import { joinURI } from './helpers/uri';
import { retrieveIcons, parseIcons } from './icons';

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
function writeManifestToFile(manifest, options, publicPath) {
  let content = { ...manifest };

  if (content.orientation === 'omit') {
    delete content.orientation;
  }

  // Object.keys(content).forEach(key => content[key] == null && delete content[key]);

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

    const { icons, assets = [] } = parsedIconsResult;
    const results = writeManifestToFile({ ...self.manifest, icons }, self.options, publicPath);
    self.assets = [results, ...assets];
    return results;
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

export function generateAppleSplashAndIconTags(assets) {
  let tags = {};
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
  return tags;
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
