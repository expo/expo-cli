/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import request from 'request';
import progress from 'request-progress';
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

const TIMER_DURATION = 30000;
const TIMEOUT = 60000;

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

async function _callMethodAsync(
  url,
  method,
  requestBody,
  requestOptions
): Promise<any> {
  const clientId = await Session.clientIdAsync();
  const user = (await UserManager.getCurrentUserAsync()) || {};

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
      throw new XDLError(
        ErrorCode.INVALID_JSON,
        'Invalid JSON returned from API: ' +
          e +
          '. Response body: ' +
          responseBody
      );
    }
  } else {
    responseObj = responseBody;
  }
  if (responseObj.err) {
    let err = ApiError(
      responseObj.code || 'API_ERROR',
      'API Response Error: ' + responseObj.err
    );
    // $FlowFixMe can't add arbitrary properties to error
    err.serverError = responseObj.err;
    throw err;
  } else {
    return responseObj;
  }
}

async function _downloadAsync(url, path, progressFunction, retryFunction) {
  let promptShown = false;
  let currentProgress = 0;
  let warningTimer = setTimeout(() => {
    if (retryFunction) {
      retryFunction();
    }
    promptShown = true;
  }, TIMER_DURATION);

  return new Promise((resolve, reject) => {
    try {
      progress(
        request(url, { timeout: TIMEOUT }, err => {
          if (err !== null) {
            if (err.code === 'ETIMEDOUT') {
              reject(Error('Server timeout.'));
            } else {
              reject(
                Error(
                  "Couldn't connect to the server, check your internet connection."
                )
              );
            }
          }
        })
      )
        .on('progress', progress => {
          const roundedProgress = Math.round(progress.percent * 100);
          if (currentProgress !== roundedProgress) {
            currentProgress = roundedProgress;
            clearTimeout(warningTimer);
            if (!promptShown) {
              warningTimer = setTimeout(() => {
                if (retryFunction) {
                  retryFunction();
                }
                promptShown = true;
              }, TIMER_DURATION);
            }
          }
          let percent = progress.percent !== undefined ? progress.percent : 0;
          if (progressFunction) {
            progressFunction(percent);
          }
        })
        .pipe(fs.createWriteStream(path))
        .on('finish', () => {
          // Since on('finish') overrides on('progress'), loading bar will never get to 100%
          // this line fixes it.
          if (progressFunction) {
            progressFunction(100);
          }
          clearTimeout(warningTimer);
          resolve();
        })
        .on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

export default class ApiClient {
  static host: string = Config.api.host;
  static port: number = Config.api.port || 80;

  static _versionCache = new Cacher(
    async () => {
      return await ApiClient.callPathAsync('/--/versions');
    },
    'versions.json',
    0,
    path.join(__dirname, '../caches/versions.json')
  );

  static _schemaCaches = {};

  static async callMethodAsync(
    methodName: string,
    args: Array<*>,
    method: string,
    requestBody: ?Object,
    requestOptions: ?Object = {}
  ): Promise<any> {
    let url =
      API_BASE_URL +
      encodeURIComponent(methodName) +
      '/' +
      encodeURIComponent(JSON.stringify(args));
    return _callMethodAsync(url, method, requestBody, requestOptions);
  }

  static async callPathAsync(
    path,
    method,
    requestBody,
    requestOptions: ?Object = {}
  ) {
    let url = ROOT_BASE_URL + path;
    return _callMethodAsync(url, method, requestBody, requestOptions);
  }

  static async versionsAsync() {
    return await ApiClient._versionCache.getAsync();
  }

  static async xdlSchemaAsync(sdkVersion) {
    if (!ApiClient._schemaCaches.hasOwnProperty(sdkVersion)) {
      ApiClient._schemaCaches[sdkVersion] = new Cacher(
        async () => {
          return await ApiClient.callPathAsync(`/--/xdl-schema/${sdkVersion}`);
        },
        `schema-${sdkVersion}.json`,
        0,
        path.join(__dirname, `../caches/schema-${sdkVersion}.json`)
      );
    }

    return await ApiClient._schemaCaches[sdkVersion].getAsync();
  }

  static async sdkVersionsAsync() {
    let versions = await ApiClient.versionsAsync();
    return versions.sdkVersions;
  }

  static async downloadAsync(
    url,
    outputPath,
    options = {},
    progressFunction,
    retryFunction
  ) {
    if (options.extract) {
      let dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
      let tmpPath = path.join(dotExpoHomeDirectory, 'tmp-download-file');
      await _downloadAsync(url, tmpPath);
      await Extract.extractAsync(tmpPath, outputPath);
      rimraf.sync(tmpPath);
    } else {
      await _downloadAsync(url, outputPath, progressFunction, retryFunction);
    }
  }
}
