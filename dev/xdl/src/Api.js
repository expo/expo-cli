/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import request from 'request';
import FormData from 'form-data';
import got from 'got';
import semver from 'semver';

import ErrorCode from './ErrorCode';
import XDLError from './XDLError';

import Config from './Config';
import * as Session from './Session';
import UserSettings from './UserSettings';

function ApiError(code, message) {
  let err = new Error(message);
  // $FlowFixMe error has no property code
  err.code = code;
  // $FlowFixMe error has no property _isApiError
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

  let headers: any = {
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
    // $FlowFixMe can't add arbitrary properties to error
    err.serverError = responseObj.err;
    throw err;
  } else {
    return responseObj;
  }
}

export default class ApiClient {
  static host: string = Config.api.host;
  static port: number = Config.api.port || 80;

  static async callMethodAsync(methodName, args, method, requestBody) {
    let url = API_BASE_URL + encodeURIComponent(methodName) + '/' +
      encodeURIComponent(JSON.stringify(args));
    return _callMethodAsync(url, method, requestBody);
  }

  static async callPathAsync(path, method, requestBody) {
    let url = ROOT_BASE_URL + path;
    return _callMethodAsync(url, method, requestBody);
  }

  static async versionsAsync() {
    return await ApiClient.callPathAsync('/--/versions');
  }

  static async sdkVersionsAsync() {
    let versions = await ApiClient.versionsAsync();
    return versions.sdkVersions;
  }

  // Gets most recent SDK version. Ensures optField is in SDK version if it is provided
  static async currentSDKVersionAsync(optField) {
    let sdkVersions = await ApiClient.sdkVersionsAsync();
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
