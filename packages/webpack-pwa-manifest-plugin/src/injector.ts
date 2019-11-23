import path from 'path';

import { parseIconsAsync, retrieveIcons } from './icons';
import { generateFingerprint, joinURI } from './utils';
import { Icon, ManifestOptions, Tag, Tags } from './WebpackPWAManifestPlugin.types';

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

function createFilename(
  filenameTemplate: string,
  json: string,
  shouldFingerprint: boolean
): string {
  const formatters: {
    pattern: RegExp;
    value: string | ((substring: string, ...args: any[]) => string);
  }[] = [
    {
      pattern: /\[hash(:([1-9]|[1-2][0-9]|3[0-2]))?\]/gi,
      value: (substring: string, limit = ':32') => {
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

  // @ts-ignore
  return formatters.reduce((acc, curr) => acc.replace(curr.pattern, curr.value), filenameTemplate);
}

// Create `manifest.json`
function writeManifestToFile(manifest: ManifestOptions, options: any, publicPath: string) {
  let content = { ...manifest };

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

export async function buildResourcesAsync(self: any, publicPath: string = '') {
  if (!self.assets || !self.options.inject) {
    let parsedIconsResult: any = {};
    if (!self.options.noResources) {
      const [results, config] = retrieveIcons(self.manifest);
      self.manifest = config;
      // TODO: Bacon: Better dynamic path
      parsedIconsResult = await parseIconsAsync(process.cwd(), results, publicPath);
    }

    const { icons, assets = [] } = parsedIconsResult;
    const results = writeManifestToFile({ ...self.manifest, icons }, self.options, publicPath);
    self.assets = [results, ...assets];
    return results;
  }
  return null;
}

export function generateAppleSplashAndIconTags(assets: Icon[]): Tags {
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

export function applyTag(obj: Tags, tag: 'meta' | 'link', content?: Tag): Tags {
  if (!content) {
    return obj;
  }
  const current = obj[tag];
  if (current) {
    if (Array.isArray(current)) {
      return {
        ...obj,
        [tag]: [...current, content],
      };
    }
    return {
      ...obj,
      [tag]: [current, content],
    };
  }

  return {
    ...obj,
    [tag]: content,
  };
}

export function generateHtmlTags(tags: { [key: string]: Tag | Tag[] }): string {
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
      for (let key of Object.keys(attrs)) {
        // @ts-ignore
        const attr = attrs[key];
        html = `${html} ${key}="${attr}"`;
      }
      html = voidTags.includes(tag) ? `${html} />` : `${html}></${tag}>`;
    }
  }
  return html;
}
