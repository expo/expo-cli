/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import request from 'request';
import fs from 'fs';
import rimraf from 'rimraf';
import path from 'path';

import { Cacher } from './tools/FsCache';
import Config from './Config';
import ErrorCode from './ErrorCode';
import * as Extract from './Extract';
import * as Session from './Session';
import UserManager from './User';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

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

async function _callMethodAsync(url, method, requestBody, requestOptions): Promise<any> {
  const clientId = await Session.clientIdAsync();
  const user = await UserManager.getCurrentUserAsync() || {};

  const { idToken, accessToken } = user;

  let headers: any = {
    'Exp-ClientId': clientId,
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  if (accessToken) {
    headers['Exp-Access-Token'] = accessToken;
  }

  let options = {
    url,
    method: method || 'get',
    headers,
  };

  if (requestOptions) {
    options = {
      ...options,
      ...requestOptions,
    };
  }

  if (requestBody) {
    options = {
      ...options,
      body: requestBody,
      json: true,
    };
  }

  let response = await request.promise(options);
  let responseBody = response.body;
  var responseObj;
  if (_.isString(responseBody)) {
    try {
      responseObj = JSON.parse(responseBody);
    } catch (e) {
      throw new XDLError(ErrorCode.INVALID_JSON, "Invalid JSON returned from API: " + e + ". Response body: " + responseBody);
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

async function _downloadAsync(url, path) {
  return new Promise((resolve, reject) => {
    try {
      request(url).pipe(fs.createWriteStream(path)).on('finish', resolve).on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

export default class ApiClient {
  static host: string = Config.api.host;
  static port: number = Config.api.port || 80;

  static _versionCache = new Cacher(
    async () => { return await ApiClient.callPathAsync('/--/versions'); },
    'versions.json',
  );

  static _schemaCaches = {};

  static async callMethodAsync(methodName: string, args: Array<*>, method: string, requestBody: ?Object, requestOptions: ?Object = {}): Promise<any> {
    let url = API_BASE_URL + encodeURIComponent(methodName) + '/' +
      encodeURIComponent(JSON.stringify(args));
    return _callMethodAsync(url, method, requestBody, requestOptions);
  }

  static async callPathAsync(path, method, requestBody, requestOptions: ?Object = {}) {
    let url = ROOT_BASE_URL + path;
    return _callMethodAsync(url, method, requestBody, requestOptions);
  }

  static async versionsAsync() {
    return await ApiClient._versionCache.getAsync();
  }

  static async xdlSchemaAsync(sdkVersion) {
    if (!ApiClient._schemaCaches.hasOwnProperty(sdkVersion)) {
      ApiClient._schemaCaches[sdkVersion] = new Cacher(
        async () => { return await ApiClient.callPathAsync(`/--/xdl-schema/${sdkVersion}`); },
        `schema-${sdkVersion}.json`,
      );
    }

    return await ApiClient._schemaCaches[sdkVersion].getAsync();
  }

  static async sdkVersionsAsync() {
    let versions = await ApiClient.versionsAsync();
    return versions.sdkVersions;
  }

  static async downloadAsync(url, outputPath, options = {}) {
    if (options.extract) {
      let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
      let tmpPath = path.join(dotExponentHomeDirectory, 'tmp-download-file');
      await _downloadAsync(url, tmpPath);
      await Extract.extractAsync(tmpPath, outputPath);
      rimraf.sync(tmpPath);
    } else {
      await _downloadAsync(url, outputPath);
    }
  }
}
