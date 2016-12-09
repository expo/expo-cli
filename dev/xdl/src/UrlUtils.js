/**
 * @flow
 */

import 'instapromise';

import ip from 'ip';
import joi from 'joi';
import os from 'os';
import url from 'url';

import ErrorCode from './ErrorCode';
import * as Exp from './Exp';
import * as ProjectSettings from './ProjectSettings';
import * as ProjectUtils from './project/ProjectUtils';
import * as Versions from './Versions';
import XDLError from './XDLError';

export async function constructBundleUrlAsync(projectRoot: string, opts: any) {
  return constructUrlAsync(projectRoot, opts, true);
}

export async function constructManifestUrlAsync(projectRoot: string, opts: any) {
  return constructUrlAsync(projectRoot, opts, false);
}

export async function constructUrlWithExtensionAsync(projectRoot: string, entryPoint: string, ext: string) {
  let bundleUrl = await constructBundleUrlAsync(projectRoot, {
    hostType: 'localhost',
    urlType: 'http',
  });

  let mainModulePath = guessMainModulePath(entryPoint);
  bundleUrl += `/${mainModulePath}.${ext}`;

  let queryParams = await constructBundleQueryParamsAsync(projectRoot, {
    dev: false,
    minify: true,
  });
  return `${bundleUrl}?${queryParams}`;
}

export async function constructPublishUrlAsync(projectRoot: string, entryPoint: string) {
  return await constructUrlWithExtensionAsync(projectRoot, entryPoint, 'bundle');
}

export async function constructAssetsUrlAsync(projectRoot: string, entryPoint: string) {
  return await constructUrlWithExtensionAsync(projectRoot, entryPoint, 'assets');
}

export async function constructDebuggerHostAsync(projectRoot: string) {
  return constructUrlAsync(projectRoot, {
    urlType: 'no-protocol',
  }, true);
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

  let pluginModule = 'exponent/tools/hashAssetFiles';
  queryParams += `&assetPlugin=${pluginModule}`;

  // Only sdk-10.1.0+ supports the assetPlugin parameter. We use only the
  // major version in the sdkVersion field, so check for 11.0.0 to be sure.
  let exp = await Exp.expJsonForRoot(projectRoot).readAsync();
  let supportsAssetPlugins = Versions.gteSdkVersion(exp, '11.0.0');
  if (!supportsAssetPlugins) {
    queryParams += '&includeAssetFileHashes=true';
  }

  return queryParams;
}

export async function constructUrlAsync(projectRoot: string, opts: any, isPackager: bool) {
  if (opts) {
    let schema = joi.object().keys({
      urlType: joi.any().valid('exp', 'http', 'redirect', 'no-protocol'),
      lanType: joi.any().valid('ip', 'hostname'),
      hostType: joi.any().valid('localhost', 'lan', 'tunnel'),
      dev: joi.boolean(),
      strict: joi.boolean(),
      minify: joi.boolean(),
      urlRandomness: joi.string(),
    });

    try {
      await joi.promise.validate(opts, schema);
    } catch (e) {
      throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
    }
  }

  let defaultOpts = await ProjectSettings.getPackagerOptsAsync(projectRoot);
  if (!opts) {
    opts = defaultOpts;
  } else {
    opts = Object.assign(defaultOpts, opts);
  }

  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);

  let protocol;
  if (opts.urlType === 'http') {
    protocol = 'http';
  } else if (opts.urlType === 'no-protocol') {
    protocol = null;
  } else {
    protocol = 'exp';

    let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
    if (exp.detachedScheme) {
      protocol = exp.detachedScheme;
    }
  }

  let hostname;
  let port;

  if (opts.hostType === 'localhost') {
    hostname = 'localhost';
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.exponentServerPort;
  } else if (opts.hostType === 'lan') {
    if (opts.lanType === 'ip') {
      hostname = ip.address();
    } else {
      // Some old versions of OSX work with hostname but not local ip address.
      hostname = os.hostname();
    }
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.exponentServerPort;
  } else {
    let ngrokUrl = isPackager ? packagerInfo.packagerNgrokUrl : packagerInfo.exponentServerNgrokUrl;
    if (!ngrokUrl) {
      throw new Error("Can't get tunnel URL because ngrok not started yet");
    }

    let pnu = url.parse(ngrokUrl);
    hostname = pnu.hostname;
    port = pnu.port;
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
    url_ += ':80'; // DUMB BUG FIX!!!! Old RN needs a port number
  }

  if (opts.urlType === 'redirect') {
    return `https://exp.host/--/to-exp/${encodeURIComponent(url_)}`;
  }

  return url_;
}

export function guessMainModulePath(entryPoint: string) {
  return entryPoint.replace(/\.js$/, '');
}

export function randomIdentifier(length: number = 6) {
  let alphabet = '23456789qwertyuipasdfghjkzxcvbnm';
  let result = '';
  for (let i = 0; i < length; i++) {
    let j = Math.floor(Math.random() * alphabet.length);
    let c = alphabet.substr(j, 1);
    result += c;
  }
  return result;
}

export function sevenDigitIdentifier() {
  return `${randomIdentifier(3)}-${randomIdentifier(4)}`;
}

export function randomIdentifierForUser(username: string) {
  return `${username}-${randomIdentifier(3)}-${randomIdentifier(2)}`;
}

export function someRandomness() {
  return [randomIdentifier(2), randomIdentifier(3)].join('-');
}

export function domainify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

export function getPlatformSpecificBundleUrl(url: string, platform: string) {
  if (url.includes(Exp.ENTRY_POINT_PLATFORM_TEMPLATE_STRING)) {
    return url.replace(Exp.ENTRY_POINT_PLATFORM_TEMPLATE_STRING, platform);
  } else {
    return url;
  }
}
