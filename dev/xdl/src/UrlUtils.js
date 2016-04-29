'use strict';

import crayon from '@ccheever/crayon';
import ip from 'ip';
import myLocalIp from 'my-local-ip';
import os from 'os';
import url from 'url';

import ProjectSettings from './ProjectSettings';

export async function constructBundleUrlAsync(projectRoot, opts) {
  return constructUrlAsync(projectRoot, opts, true);
}

export async function constructManifestUrlAsync(projectRoot, opts) {
  return constructUrlAsync(projectRoot, opts, false);
}

export async function constructPublishUrlAsync(projectRoot, entryPoint) {
  let bundleUrl = await constructBundleUrlAsync(projectRoot, {
    ngrok: true,
    http: true,
  });

  let mainModulePath = guessMainModulePath(entryPoint);
  bundleUrl += `/${mainModulePath}.bundle`;

  return bundleUrl + '?' + constructBundleQueryParams({
    dev: false,
    minify: false,
  });
}

export async function constructDebuggerHostAsync(projectRoot) {
  return constructUrlAsync(projectRoot, {
    noProtocol: true,
  }, true);
}

export function constructBundleQueryParams(opts) {
  let queryParams = 'dev=' + encodeURIComponent(!!opts.dev);

  if (opts.hasOwnProperty('strict')) {
    queryParams += '&strict=' + encodeURIComponent(!!opts.strict);
  }

  if (opts.hasOwnProperty('minify')) {
    queryParams += '&minify=' + encodeURIComponent(!!opts.minify);
  }

  queryParams += '&hot=false';

  return queryParams;
}

async function constructUrlAsync(projectRoot, opts, isPackager) {
  let defaultOpts = await ProjectSettings.getPackagerOptsAsync(projectRoot);
  if (!opts) {
    opts = defaultOpts;
  } else {
    opts = Object.assign(defaultOpts, opts);
  }

  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);

  let protocol = 'exp';
  if (opts.http) {
    protocol = 'http';
  } else if (opts.noProtocol) {
    protocol = null;
  }

  let hostname;
  let port;

  if (opts.localhost) {
    hostname = 'localhost';
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.port;
  } else if (opts.lan) {
    hostname = os.hostname();
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.port;
  } else if (opts.lanIp) {
    hostname = myLocalIp;
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.port;
  } else {
    let ngrokUrl = isPackager ? packagerInfo.packagerNgrok : packagerInfo.ngrok;
    if (!ngrokUrl) {
      throw new Error("Can't get ngrok URL because ngrok not started yet");
    }

    let pnu = url.parse(ngrokUrl);
    hostname = pnu.hostname;
    port = pnu.port;
  }

  let url_ = '';
  if (protocol) {
    url_ += protocol + '://'
  }

  url_ += hostname;

  if (port) {
    url_ += ':' + port;
  } else {
    url_ += ':80'; // DUMB BUG FIX!!!! Old RN needs a port number
  }

  if (opts.redirect) {
    return 'http://exp.host/--/to-exp/' + encodeURIComponent(url_);
  }

  return url_;
}

export function expUrlFromHttpUrl(url_) {
  return ('' + url_).replace(/^http(s?)/, 'exp');
}

export function httpUrlFromExpUrl(url_) {
  return ('' + url_).replace(/^exp(s?)/, 'http');
}

export function guessMainModulePath(entryPoint) {
  return entryPoint.replace(/\.js$/, '');
}

export function randomIdentifier(length=6) {
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
  return randomIdentifier(3) + '-' + randomIdentifier(4);
}

export function randomIdentifierForUser(username) {
  return username + '-' + randomIdentifier(3) + '-' + randomIdentifier(2);
}


export function randomIdentifierForLoggedOutUser() {
  // TODO: Disallow usernames that start with `00-`
  return '00-' + sevenDigitIdentifier();
}

export function someRandomness() {
  return [randomIdentifier(2), randomIdentifier(3)].join('-');
}

export function domainify(s) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}
