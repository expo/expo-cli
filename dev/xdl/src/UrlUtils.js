'use strict';

import 'instapromise';

import joi from 'joi';
import myLocalIp from 'my-local-ip';
import os from 'os';
import url from 'url';

import ErrorCode from './ErrorCode';
import ProjectSettings from './ProjectSettings';
import XDLError from './XDLError';

async function constructBundleUrlAsync(projectRoot, opts) {
  return constructUrlAsync(projectRoot, opts, true);
}

async function constructManifestUrlAsync(projectRoot, opts) {
  return constructUrlAsync(projectRoot, opts, false);
}

async function constructPublishUrlAsync(projectRoot, entryPoint) {
  let bundleUrl = await constructBundleUrlAsync(projectRoot, {
    hostType: 'localhost',
    urlType: 'http',
  });

  let mainModulePath = guessMainModulePath(entryPoint);
  bundleUrl += `/${mainModulePath}.bundle`;

  return bundleUrl + '?' + constructBundleQueryParams({
    dev: false,
    minify: true,
  });
}

async function constructDebuggerHostAsync(projectRoot) {
  return constructUrlAsync(projectRoot, {
    urlType: 'no-protocol',
  }, true);
}

function constructBundleQueryParams(opts) {
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
  if (opts) {
    let schema = joi.object().keys({
      urlType: joi.any().valid('exp', 'http', 'redirect', 'no-protocol'),
      hostType: joi.any().valid('localhost', 'lan', 'lanIp', 'tunnel'),
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

  let protocol = 'exp';
  if (opts.urlType === 'http') {
    protocol = 'http';
  } else if (opts.urlType === 'no-protocol') {
    protocol = null;
  }

  let hostname;
  let port;

  if (opts.hostType === 'localhost') {
    hostname = 'localhost';
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.exponentServerPort;
  } else if (opts.hostType === 'lan') {
    hostname = os.hostname();
    port = isPackager ? packagerInfo.packagerPort : packagerInfo.exponentServerPort;
  } else if (opts.hostType === 'lanIp') { // TODO: is this used anywhere?
    hostname = myLocalIp;
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
    url_ += protocol + '://';
  }

  url_ += hostname;

  if (port) {
    url_ += ':' + port;
  } else {
    url_ += ':80'; // DUMB BUG FIX!!!! Old RN needs a port number
  }

  if (opts.urlType === 'redirect') {
    return 'https://exp.host/--/to-exp/' + encodeURIComponent(url_);
  }

  return url_;
}

function expUrlFromHttpUrl(url_) {
  return ('' + url_).replace(/^http(s?)/, 'exp');
}

function httpUrlFromExpUrl(url_) {
  return ('' + url_).replace(/^exp(s?)/, 'http');
}

function guessMainModulePath(entryPoint) {
  return entryPoint.replace(/\.js$/, '');
}

function randomIdentifier(length = 6) {
  let alphabet = '23456789qwertyuipasdfghjkzxcvbnm';
  let result = '';
  for (let i = 0; i < length; i++) {
    let j = Math.floor(Math.random() * alphabet.length);
    let c = alphabet.substr(j, 1);
    result += c;
  }
  return result;
}

function sevenDigitIdentifier() {
  return randomIdentifier(3) + '-' + randomIdentifier(4);
}

function randomIdentifierForUser(username) {
  return username + '-' + randomIdentifier(3) + '-' + randomIdentifier(2);
}

function randomIdentifierForLoggedOutUser() {
  // TODO: Disallow usernames that start with `00-`
  return '00-' + sevenDigitIdentifier();
}

function someRandomness() {
  return [randomIdentifier(2), randomIdentifier(3)].join('-');
}

function domainify(s) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

module.exports = {
  constructBundleUrlAsync,
  constructManifestUrlAsync,
  constructPublishUrlAsync,
  constructDebuggerHostAsync,
  constructBundleQueryParams,
  expUrlFromHttpUrl,
  httpUrlFromExpUrl,
  guessMainModulePath,
  randomIdentifier,
  sevenDigitIdentifier,
  randomIdentifierForUser,
  randomIdentifierForLoggedOutUser,
  someRandomness,
  domainify,
};
