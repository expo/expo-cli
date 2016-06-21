'use strict';

import 'instapromise';

let _ = require('lodash');
let request = require('request');
import FormData from 'form-data';
import got from 'got';
import semver from 'semver';

import ErrorCode from './ErrorCode';
import XDLError from './XDLError';

let Config = require('./Config');
let Session = require('./Session');
let UserSettings = require('./UserSettings');

function ApiError(code, message) {
  let err = new Error(message);
  err.code = code;
  err._isApiError = true;
  return err;
}

let ROOT_BASE_URL = `${Config.api.scheme}://${Config.api.host}`;
if (Config.api.port) {
  ROOT_BASE_URL += ':' + Config.api.port;
}
let API_BASE_URL = ROOT_BASE_URL + '/--/api/';

async function _callMethodAsync(url, method, requestBody) {
  let clientId = await Session.clientIdAsync();
  let {username} = await UserSettings.readAsync();
  let headers = {
    'Exp-ClientId': clientId,
  };
  if (username) {
    headers['Exp-Username'] = username;
  }

  let options = {
    url,
    method: method || 'get',
    headers,
  };

  let response;
  // TODO: move everything from `request` to `got`
  if (requestBody) {
    if (requestBody instanceof FormData) {
      // Use `got` library to handle FormData uploads
      options = {
        ...options,
        body: requestBody,
      };

      options.headers = {
        ...options.headers,
        ...requestBody.getHeaders(),
      };

      response = await got(url, options);
    } else {
      options = {
        ...options,
        body: requestBody,
        json: true,
      };
    }
  }

  if (!response) {
    // Use `got` only for FormData. Use `request` for everything else.
    response = await request.promise(options);
  }
  let responseBody = response.body;
  var responseObj;
  if (_.isString(responseBody)) {
    try {
      responseObj = JSON.parse(responseBody);
    } catch (e) {
      throw new Error("Invalid JSON returned from API: " + e + ". Response body: " + responseBody);
    }
  } else {
    responseObj = responseBody;
  }
  if (responseObj.err) {
    let err = ApiError(responseObj.code || 'API_ERROR', "API Response Error: " + responseObj.err);
    err.serverError = responseObj.err;
    throw err;
  } else {
    return responseObj;
  }
}

export default class ApiClient {

  static async callMethodAsync(methodName, args, method, requestBody) {
    let url = API_BASE_URL + encodeURIComponent(methodName) + '/' +
      encodeURIComponent(JSON.stringify(args));
    return _callMethodAsync(url, method, requestBody);
  }

  static async callPathAsync(path, method, requestBody) {
    let url = ROOT_BASE_URL + path;
    return _callMethodAsync(url, method, requestBody);
  }

  static async sdkVersionsAsync() {
    return await ApiClient.callPathAsync('/--/sdk-versions');
  }

  // Gets most recent SDK version. Ensures optField is in SDK version if it is provided
  static async currentSDKVersionAsync(optField) {
    let sdkVersions = await ApiClient.callPathAsync('/--/sdk-versions');
    let currentSDKVersion = null;

    _.forEach(sdkVersions, (value, key) => {
      if ((!currentSDKVersion || semver.gt(key, currentSDKVersion)) &&
          (!optField || value[optField])) {
        currentSDKVersion = key;
      }
    });

    if (!currentSDKVersion) {
      throw new XDLError(ErrorCode.NO_SDK_VERSION, 'No SDK version found');
    }

    return sdkVersions[currentSDKVersion];
  }
}

ApiClient.host = Config.api.host;
ApiClient.port = Config.api.port || 80;

module.exports = ApiClient;
