import { ExpoConfig, getConfig } from '@expo/config';
import joi from '@hapi/joi';
import assert from 'assert';
import os from 'os';
import QueryString from 'querystring';
import resolveFrom from 'resolve-from';
import url from 'url';

import {
  Config,
  ConnectionStatus,
  ip,
  ProjectSettings,
  ProjectUtils,
  Versions,
  XDLError,
} from './internal';

interface URLOptions extends Omit<ProjectSettings.ProjectSettings, 'urlRandomness'> {
  urlType: null | 'exp' | 'http' | 'no-protocol' | 'redirect' | 'custom';
}

interface MetroQueryOptions {
  dev?: boolean;
  strict?: boolean;
  minify?: boolean;
}

export async function constructBundleUrlAsync(
  projectRoot: string,
  opts: Partial<URLOptions>,
  requestHostname?: string
) {
  return await constructUrlAsync(projectRoot, opts, true, requestHostname);
}

export async function constructDeepLinkAsync(
  projectRoot: string,
  opts?: Partial<URLOptions>,
  requestHostname?: string
) {
  const { devClient } = await ProjectSettings.getPackagerOptsAsync(projectRoot);

  if (devClient) {
    return constructDevClientUrlAsync(projectRoot, opts, requestHostname);
  } else {
    return constructManifestUrlAsync(projectRoot, opts, requestHostname);
  }
}

export async function constructManifestUrlAsync(
  projectRoot: string,
  opts?: Partial<URLOptions>,
  requestHostname?: string
) {
  return await constructUrlAsync(projectRoot, opts ?? null, false, requestHostname);
}

export async function constructDevClientUrlAsync(
  projectRoot: string,
  opts?: Partial<URLOptions>,
  requestHostname?: string
) {
  const { scheme } = await ProjectSettings.getPackagerOptsAsync(projectRoot);
  if (!scheme || typeof scheme !== 'string') {
    throw new XDLError('NO_DEV_CLIENT_SCHEME', 'No scheme specified for development client');
  }
  const protocol = resolveProtocol(projectRoot, { scheme, urlType: 'custom' });
  const manifestUrl = await constructManifestUrlAsync(
    projectRoot,
    { ...opts, urlType: 'http' },
    requestHostname
  );
  return `${protocol}://expo-development-client/?url=${encodeURIComponent(manifestUrl)}`;
}

// gets the base manifest URL and removes the scheme
export async function constructHostUriAsync(
  projectRoot: string,
  requestHostname?: string
): Promise<string> {
  const urlString = await constructUrlAsync(projectRoot, null, false, requestHostname);
  // we need to use node's legacy urlObject api since the newer one doesn't like empty protocols
  const urlObj = url.parse(urlString);
  urlObj.protocol = '';
  urlObj.slashes = false;
  return url.format(urlObj);
}

export async function constructLogUrlAsync(
  projectRoot: string,
  requestHostname?: string
): Promise<string> {
  const baseUrl = await constructUrlAsync(projectRoot, { urlType: 'http' }, false, requestHostname);
  return `${baseUrl}/logs`;
}

export async function constructUrlWithExtensionAsync(
  projectRoot: string,
  entryPoint: string,
  ext: string,
  requestHostname?: string,
  metroQueryOptions?: MetroQueryOptions
) {
  const defaultOpts = {
    dev: false,
    minify: true,
  };
  metroQueryOptions = metroQueryOptions || defaultOpts;
  let bundleUrl = await constructBundleUrlAsync(
    projectRoot,
    {
      hostType: 'localhost',
      urlType: 'http',
    },
    requestHostname
  );

  const mainModulePath = stripJSExtension(entryPoint);
  bundleUrl += `/${mainModulePath}.${ext}`;

  const queryParams = constructBundleQueryParams(projectRoot, metroQueryOptions);
  return `${bundleUrl}?${queryParams}`;
}

export async function constructPublishUrlAsync(
  projectRoot: string,
  entryPoint: string,
  requestHostname?: string,
  metroQueryOptions?: MetroQueryOptions
): Promise<string> {
  return await constructUrlWithExtensionAsync(
    projectRoot,
    entryPoint,
    'bundle',
    requestHostname,
    metroQueryOptions
  );
}

export async function constructSourceMapUrlAsync(
  projectRoot: string,
  entryPoint: string,
  requestHostname?: string
): Promise<string> {
  return await constructUrlWithExtensionAsync(projectRoot, entryPoint, 'map', requestHostname);
}

export async function constructAssetsUrlAsync(
  projectRoot: string,
  entryPoint: string,
  requestHostname?: string
): Promise<string> {
  return await constructUrlWithExtensionAsync(projectRoot, entryPoint, 'assets', requestHostname);
}

export async function constructDebuggerHostAsync(
  projectRoot: string,
  requestHostname?: string
): Promise<string> {
  return await constructUrlAsync(
    projectRoot,
    {
      urlType: 'no-protocol',
    },
    true,
    requestHostname
  );
}

export function constructBundleQueryParams(projectRoot: string, opts: MetroQueryOptions): string {
  const { exp } = getConfig(projectRoot);
  return constructBundleQueryParamsWithConfig(projectRoot, opts, exp);
}

export function constructBundleQueryParamsWithConfig(
  projectRoot: string,
  opts: MetroQueryOptions,
  exp: Pick<ExpoConfig, 'sdkVersion'>
): string {
  const queryParams: Record<string, boolean | string> = {
    dev: !!opts.dev,
    hot: false,
  };

  if ('strict' in opts) {
    queryParams.strict = !!opts.strict;
  }

  if ('minify' in opts) {
    // TODO: Maybe default this to true if dev is false
    queryParams.minify = !!opts.minify;
  }

  // No special requirements after SDK 33 (Jun 5 2019)
  if (Versions.gteSdkVersion(exp, '33.0.0')) {
    return QueryString.stringify(queryParams);
  }

  // TODO: Remove this ...

  // SDK11 to SDK32 require us to inject hashAssetFiles through the params, but this is not
  // needed with SDK33+
  const supportsAssetPlugins = Versions.gteSdkVersion(exp, '11.0.0');
  const usesAssetPluginsQueryParam = supportsAssetPlugins && Versions.lteSdkVersion(exp, '32.0.0');
  if (usesAssetPluginsQueryParam) {
    // Use an absolute path here so that we can not worry about symlinks/relative requires
    const pluginModule = resolveFrom(projectRoot, 'expo/tools/hashAssetFiles');
    queryParams.assetPlugin = encodeURIComponent(pluginModule);
  } else if (!supportsAssetPlugins) {
    // Only sdk-10.1.0+ supports the assetPlugin parameter. We use only the
    // major version in the sdkVersion field, so check for 11.0.0 to be sure.
    queryParams.includeAssetFileHashes = true;
  }

  return QueryString.stringify(queryParams);
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

function assertValidOptions(opts: Partial<URLOptions>): URLOptions {
  const schema = joi.object().keys({
    devClient: joi.boolean().optional(),
    scheme: joi.string().optional().allow(null),
    // Replaced by `scheme`
    urlType: joi.any().valid('exp', 'http', 'redirect', 'no-protocol').allow(null),
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

  return opts as URLOptions;
}

async function ensureOptionsAsync(
  projectRoot: string,
  opts: Partial<URLOptions> | null
): Promise<URLOptions> {
  if (opts) {
    assertValidOptions(opts);
  }

  const defaultOpts = await ProjectSettings.getPackagerOptsAsync(projectRoot);
  if (!opts) {
    return { urlType: null, ...defaultOpts };
  }
  const optionsWithDefaults = { ...defaultOpts, ...opts };
  return assertValidOptions(optionsWithDefaults);
}

function resolveProtocol(
  projectRoot: string,
  { urlType, ...options }: Pick<URLOptions, 'urlType' | 'scheme'>
): string | null {
  if (urlType === 'http') {
    return 'http';
  } else if (urlType === 'no-protocol') {
    return null;
  } else if (urlType === 'custom') {
    return options.scheme;
  }
  let protocol = 'exp';

  const { exp } = getConfig(projectRoot);

  // We only use these values from the config
  const { scheme, detach, sdkVersion } = exp;

  if (detach) {
    // Normalize schemes and filter invalid schemes.
    const schemes = (Array.isArray(scheme) ? scheme : [scheme]).filter(
      (scheme: any) => typeof scheme === 'string' && !!scheme
    );
    // Get the first valid scheme.
    const firstScheme = schemes[0];
    if (firstScheme && Versions.gteSdkVersion({ sdkVersion }, '27.0.0')) {
      protocol = firstScheme;
    } else if (detach.scheme) {
      // must keep this fallback in place for older projects
      // and those detached with an older version of xdl
      protocol = detach.scheme;
    }
  }

  return protocol;
}

export async function constructUrlAsync(
  projectRoot: string,
  incomingOpts: Partial<URLOptions> | null,
  isPackager: boolean,
  requestHostname?: string
): Promise<string> {
  const opts = await ensureOptionsAsync(projectRoot, incomingOpts);

  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);

  let protocol = resolveProtocol(projectRoot, opts);

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
  } else if (opts.hostType === 'lan' || ConnectionStatus.isOffline()) {
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

  const url_ = joinURLComponents({ protocol, hostname, port });

  if (opts.urlType === 'redirect') {
    return createRedirectURL(url_);
  }

  return url_;
}

function createRedirectURL(url: string): string {
  return `https://exp.host/--/to-exp/${encodeURIComponent(url)}`;
}

function joinURLComponents({
  protocol,
  hostname,
  port,
}: {
  protocol?: string | null;
  hostname?: string | null;
  port?: string | number | null;
}): string {
  assert(hostname, 'hostname cannot be inferred.');
  // Android HMR breaks without this port 80
  const validPort = port ?? '80';
  const validProtocol = protocol ? `${protocol}://` : '';

  return `${validProtocol}${hostname}:${validPort}`;
}

export function stripJSExtension(entryPoint: string): string {
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

export function isHttps(urlString: string): boolean {
  return isURL(urlString, { protocols: ['https'] });
}

export function isURL(
  urlString: string,
  { protocols, requireProtocol }: { protocols?: string[]; requireProtocol?: boolean }
) {
  try {
    // eslint-disable-next-line
    new url.URL(urlString);
    const parsed = url.parse(urlString);
    if (!parsed.protocol && !requireProtocol) {
      return true;
    }
    return protocols
      ? parsed.protocol
        ? protocols.map(x => `${x.toLowerCase()}:`).includes(parsed.protocol)
        : false
      : true;
  } catch (err) {
    return false;
  }
}
