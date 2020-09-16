import { getConfig, resolveModule } from '@expo/config';
import joi from '@hapi/joi';
import os from 'os';
import url from 'url';
import validator from 'validator';

import Config from './Config';
import * as ProjectSettings from './ProjectSettings';
import * as Versions from './Versions';
import XDLError from './XDLError';
import ip from './ip';
import * as ProjectUtils from './project/ProjectUtils';

export async function constructBundleUrlAsync(
  projectRoot: string,
  opts: any,
  requestHostname?: string
) {
  return constructUrlAsync(projectRoot, opts, true, requestHostname);
}

export async function constructManifestUrlAsync(
  projectRoot: string,
  opts?: any,
  requestHostname?: string
) {
  return constructUrlAsync(projectRoot, opts, false, requestHostname);
}

// gets the base manifest URL and removes the scheme
export async function constructHostUriAsync(projectRoot: string, requestHostname?: string) {
  const urlString = await constructUrlAsync(projectRoot, null, false, requestHostname);
  // we need to use node's legacy urlObject api since the newer one doesn't like empty protocols
  const urlObj = url.parse(urlString);
  urlObj.protocol = '';
  urlObj.slashes = false;
  return url.format(urlObj);
}

export async function constructLogUrlAsync(projectRoot: string, requestHostname?: string) {
  const baseUrl = await constructUrlAsync(projectRoot, { urlType: 'http' }, false, requestHostname);
  return `${baseUrl}/logs`;
}

export async function constructUrlWithExtensionAsync(
  projectRoot: string,
  entryPoint: string,
  ext: string,
  requestHostname?: string,
  opts?: object
) {
  const defaultOpts = {
    dev: false,
    minify: true,
  };
  opts = opts || defaultOpts;
  let bundleUrl = await constructBundleUrlAsync(
    projectRoot,
    {
      hostType: 'localhost',
      urlType: 'http',
    },
    requestHostname
  );

  const mainModulePath = guessMainModulePath(entryPoint);
  bundleUrl += `/${mainModulePath}.${ext}`;

  const queryParams = await constructBundleQueryParamsAsync(projectRoot, opts);
  return `${bundleUrl}?${queryParams}`;
}

export async function constructPublishUrlAsync(
  projectRoot: string,
  entryPoint: string,
  requestHostname?: string,
  opts?: object
) {
  return await constructUrlWithExtensionAsync(
    projectRoot,
    entryPoint,
    'bundle',
    requestHostname,
    opts
  );
}

export async function constructSourceMapUrlAsync(
  projectRoot: string,
  entryPoint: string,
  requestHostname?: string
) {
  return await constructUrlWithExtensionAsync(projectRoot, entryPoint, 'map', requestHostname);
}

export async function constructAssetsUrlAsync(
  projectRoot: string,
  entryPoint: string,
  requestHostname?: string
) {
  return await constructUrlWithExtensionAsync(projectRoot, entryPoint, 'assets', requestHostname);
}

export async function constructDebuggerHostAsync(projectRoot: string, requestHostname?: string) {
  return constructUrlAsync(
    projectRoot,
    {
      urlType: 'no-protocol',
    },
    true,
    requestHostname
  );
}

export async function constructBundleQueryParamsAsync(projectRoot: string, opts: any) {
  let queryParams = `dev=${encodeURIComponent(!!opts.dev)}`;

  if (opts.hasOwnProperty('strict')) {
    queryParams += `&strict=${encodeURIComponent(!!opts.strict)}`;
  }

  if (opts.hasOwnProperty('minify')) {
    queryParams += `&minify=${encodeURIComponent(!!opts.minify)}`;
  }

  queryParams += '&hot=false';

  const { exp } = getConfig(projectRoot);

  // SDK11 to SDK32 require us to inject hashAssetFiles through the params, but this is not
  // needed with SDK33+
  const supportsAssetPlugins = Versions.gteSdkVersion(exp, '11.0.0');
  const usesAssetPluginsQueryParam = supportsAssetPlugins && Versions.lteSdkVersion(exp, '32.0.0');
  if (usesAssetPluginsQueryParam) {
    // Use an absolute path here so that we can not worry about symlinks/relative requires
    const pluginModule = resolveModule('expo/tools/hashAssetFiles', projectRoot, exp);
    queryParams += `&assetPlugin=${encodeURIComponent(pluginModule)}`;
  } else if (!supportsAssetPlugins) {
    // Only sdk-10.1.0+ supports the assetPlugin parameter. We use only the
    // major version in the sdkVersion field, so check for 11.0.0 to be sure.
    queryParams += '&includeAssetFileHashes=true';
  }

  return queryParams;
}

export async function constructWebAppUrlAsync(
  projectRoot: string,
  options: { hostType?: 'localhost' | 'lan' | 'tunnel' } = {}
): Promise<string | null> {
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.webpackServerPort) {
    return null;
  }

  const { https, hostType } = await ProjectSettings.readAsync(projectRoot);
  const host = (options.hostType ?? hostType) === 'localhost' ? 'localhost' : ip.address();

  let urlType = 'http';
  if (https === true) {
    urlType = 'https';
  }

  return `${urlType}://${host}:${packagerInfo.webpackServerPort}`;
}

export async function constructUrlAsync(
  projectRoot: string,
  opts: any,
  isPackager: boolean,
  requestHostname?: string
): Promise<string> {
  if (opts) {
    const schema = joi.object().keys({
      urlType: joi.any().valid('exp', 'http', 'redirect', 'no-protocol'),
      lanType: joi.any().valid('ip', 'hostname'),
      hostType: joi.any().valid('localhost', 'lan', 'tunnel'),
      dev: joi.boolean(),
      strict: joi.boolean(),
      minify: joi.boolean(),
      https: joi.boolean().optional(),
      urlRandomness: joi.string().optional().allow(null),
    });

    const { error } = schema.validate(opts);
    if (error) {
      throw new XDLError('INVALID_OPTIONS', error.toString());
    }
  }

  const defaultOpts = await ProjectSettings.getPackagerOptsAsync(projectRoot);
  if (!opts) {
    opts = defaultOpts;
  } else {
    opts = Object.assign({}, defaultOpts, opts);
  }

  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);

  let protocol;
  if (opts.urlType === 'http') {
    protocol = 'http';
  } else if (opts.urlType === 'no-protocol') {
    protocol = null;
  } else {
    protocol = 'exp';

    const { exp } = getConfig(projectRoot);
    if (exp.detach) {
      // Normalize schemes and filter invalid schemes.
      const schemes = (Array.isArray(exp.scheme) ? exp.scheme : [exp.scheme]).filter(
        (scheme: any) => typeof scheme === 'string' && !!scheme
      );
      // Get the first valid scheme.
      const firstScheme = schemes[0];
      if (firstScheme && Versions.gteSdkVersion(exp, '27.0.0')) {
        protocol = firstScheme;
      } else if (exp.detach.scheme) {
        // must keep this fallback in place for older projects
        // and those detached with an older version of xdl
        protocol = exp.detach.scheme;
      }
    }
  }

  let hostname;
  let port;

  const proxyURL = isPackager
    ? process.env.EXPO_PACKAGER_PROXY_URL
    : process.env.EXPO_MANIFEST_PROXY_URL;
  if (proxyURL) {
    const parsedProxyURL = url.parse(proxyURL);
    hostname = parsedProxyURL.hostname;
    port = parsedProxyURL.port;
    if (parsedProxyURL.protocol === 'https:') {
      if (protocol === 'http') {
        protocol = 'https';
      }
      if (!port) {
        port = '443';
      }
    }
  } else if (opts.hostType === 'localhost' || requestHostname === 'localhost') {
    hostname = '127.0.0.1';
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.expoServerPort;
  } else if (opts.hostType === 'lan' || Config.offline) {
    if (process.env.EXPO_PACKAGER_HOSTNAME) {
      hostname = process.env.EXPO_PACKAGER_HOSTNAME.trim();
    } else if (process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
      hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME.trim();
    } else if (opts.lanType === 'ip') {
      if (requestHostname) {
        hostname = requestHostname;
      } else {
        hostname = ip.address();
      }
    } else {
      // Some old versions of OSX work with hostname but not local ip address.
      hostname = os.hostname();
    }
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.expoServerPort;
  } else {
    const ngrokUrl = isPackager ? packagerInfo.packagerNgrokUrl : packagerInfo.expoServerNgrokUrl;
    if (!ngrokUrl || typeof ngrokUrl !== 'string') {
      // TODO: if you start with --tunnel flag then this warning will always
      // show up right before the tunnel starts...
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        'Tunnel URL not found (it might not be ready yet), falling back to LAN URL.',
        'tunnel-url-not-found'
      );
      return constructUrlAsync(
        projectRoot,
        { ...opts, hostType: 'lan' },
        isPackager,
        requestHostname
      );
    } else {
      ProjectUtils.clearNotification(projectRoot, 'tunnel-url-not-found');
      const pnu = url.parse(ngrokUrl);
      hostname = pnu.hostname;
      port = pnu.port;
    }
  }

  let url_ = '';
  if (protocol) {
    url_ += `${protocol}://`;
  }

  if (!hostname) {
    throw new Error('Hostname cannot be inferred.');
  }

  url_ += hostname;

  if (port) {
    url_ += `:${port}`;
  } else {
    // Android HMR breaks without this :|
    url_ += ':80';
  }

  if (opts.urlType === 'redirect') {
    return `https://exp.host/--/to-exp/${encodeURIComponent(url_)}`;
  }

  return url_;
}

export function guessMainModulePath(entryPoint: string): string {
  return entryPoint.replace(/\.js$/, '');
}

export function randomIdentifier(length: number = 6): string {
  const alphabet = '23456789qwertyuipasdfghjkzxcvbnm';
  let result = '';
  for (let i = 0; i < length; i++) {
    const j = Math.floor(Math.random() * alphabet.length);
    const c = alphabet.substr(j, 1);
    result += c;
  }
  return result;
}

export function sevenDigitIdentifier(): string {
  return `${randomIdentifier(3)}-${randomIdentifier(4)}`;
}

export function randomIdentifierForUser(username: string): string {
  return `${username}-${randomIdentifier(3)}-${randomIdentifier(2)}`;
}

export function someRandomness(): string {
  return [randomIdentifier(2), randomIdentifier(3)].join('-');
}

export function domainify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function isHttps(url: string): boolean {
  return validator.isURL(url, { protocols: ['https'] });
}
