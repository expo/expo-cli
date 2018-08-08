/**
 * @flow
 */

import _ from 'lodash';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import path from 'path';
import axios from 'axios';
import followRedirects from 'follow-redirects';
import concat from 'concat-stream';

import { Cacher } from './tools/FsCache';
import Config from './Config';
import { isNode } from './tools/EnvironmentHelper';
import ErrorCode from './ErrorCode';
import * as Extract from './Extract';
import * as Session from './Session';
import UserManager from './User';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

followRedirects.maxBodyLength = 50 * 1024 * 1024; // 50 MB

const TIMER_DURATION = 30000;
const TIMEOUT = 3600000;

function ApiError(code, message) {
  let err = new Error(message);
  // $FlowFixMe error has no property code
  err.code = code;
  // $FlowFixMe error has no property _isApiError
  err._isApiError = true;
  return err;
}

// These aren't constants because some commands switch between staging and prod
function _rootBaseUrl() {
  return `${Config.api.scheme}://${Config.api.host}`;
}

function _apiBaseUrl() {
  let rootBaseUrl = _rootBaseUrl();
  if (Config.api.port) {
    rootBaseUrl += ':' + Config.api.port;
  }
  return rootBaseUrl + '/--/api';
}

async function _callMethodAsync(
  url,
  method,
  requestBody,
  requestOptions,
  returnEntireResponse = false
): Promise<any> {
  const clientId = await Session.clientIdAsync();
  const session = await UserManager.getSessionAsync();
  const skipValidationToken = process.env['EXPO_SKIP_MANIFEST_VALIDATION_TOKEN'];

  let headers: any = {
    'Exp-ClientId': clientId,
  };

  if (skipValidationToken) {
    headers['Exp-Skip-Manifest-Validation-Token'] = skipValidationToken;
  }

  if (session) {
    headers['Expo-Session'] = session.sessionSecret;
  }

  let options = {
    url,
    method: method || 'get',
    headers,
  };

  if (requestBody) {
    options = {
      ...options,
      data: requestBody,
    };
  }

  if (requestOptions) {
    if (requestOptions.formData) {
      let data = requestOptions.formData;
      if (isNode()) {
        let convertedFormData = await _convertFormDataToBuffer(requestOptions.formData);
        data = convertedFormData.data;
        options.headers = {
          ...options.headers,
          ...requestOptions.formData.getHeaders(),
        };
      }
      options = { ...options, data };
    } else {
      options = { ...options, ...requestOptions };
    }
  }
  let response = await axios.request(options);
  if (!response) {
    throw new Error('Unexpected error: Request failed.');
  }
  let responseBody = response.data;
  var responseObj;
  if (_.isString(responseBody)) {
    try {
      responseObj = JSON.parse(responseBody);
    } catch (e) {
      throw new XDLError(
        ErrorCode.INVALID_JSON,
        'Invalid JSON returned from API: ' + e + '. Response body: ' + responseBody
      );
    }
  } else {
    responseObj = responseBody;
  }
  if (responseObj.err) {
    let err = ApiError(responseObj.code || 'API_ERROR', 'API Response Error: ' + responseObj.err);
    // $FlowFixMe can't add arbitrary properties to error
    err.serverError = responseObj.err;
    throw err;
  } else {
    return returnEntireResponse ? response : responseObj;
  }
}

async function _convertFormDataToBuffer(formData) {
  return new Promise(resolve => {
    formData.pipe(concat({ encoding: 'buffer' }, data => resolve({ data })));
  });
}

async function _downloadAsync(url, outputPath, progressFunction, retryFunction) {
  let promptShown = false;
  let currentProgress = 0;

  let { cancel, token } = axios.CancelToken.source();

  let warningTimer = setTimeout(() => {
    if (retryFunction) {
      retryFunction(cancel);
    }
    promptShown = true;
  }, TIMER_DURATION);

  let config;
  // Checks if the call is being made in XDE or exp. (If XDE = XHR, if exp = HTTP);
  if (!isNode()) {
    config = {
      timeout: TIMEOUT,
      responseType: 'arraybuffer',
      cancelToken: token,
      onDownloadProgress: progressEvent => {
        const roundedProgress = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
        if (currentProgress !== roundedProgress) {
          currentProgress = roundedProgress;
          clearTimeout(warningTimer);
          if (!promptShown) {
            warningTimer = setTimeout(() => {
              if (retryFunction) {
                retryFunction(cancel);
              }
              promptShown = true;
            }, TIMER_DURATION);
          }
        }
        if (progressFunction) {
          progressFunction(roundedProgress);
        }
      },
    };
    let response = await axios(url, config);
    await fs.writeFile(outputPath, Buffer.from(response.data));
    clearTimeout(warningTimer);
  } else {
    const tmpPath = `${outputPath}.download`;
    config = {
      timeout: TIMEOUT,
      responseType: 'stream',
      cancelToken: token,
    };
    let response = await axios(url, config);
    await new Promise(resolve => {
      let totalDownloadSize = response.data.headers['content-length'];
      let downloadProgress = 0;
      response.data
        .on('data', chunk => {
          downloadProgress += chunk.length;
          const roundedProgress = Math.floor((downloadProgress / totalDownloadSize) * 100);
          if (currentProgress !== roundedProgress) {
            currentProgress = roundedProgress;
            clearTimeout(warningTimer);
            if (!promptShown) {
              warningTimer = setTimeout(() => {
                if (retryFunction) {
                  retryFunction(cancel);
                }
                promptShown = true;
              }, TIMER_DURATION);
            }
            if (progressFunction) {
              progressFunction(roundedProgress);
            }
          }
        })
        .on('end', () => {
          clearTimeout(warningTimer);
          if (progressFunction && currentProgress !== 100) {
            progressFunction(100);
          }
          resolve();
        })
        .pipe(fs.createWriteStream(tmpPath));
    });
    await fs.rename(tmpPath, outputPath);
  }
}

export default class ApiClient {
  static host: string = Config.api.host;
  static port: number = Config.api.port || 80;

  static _versionCache = new Cacher(
    () => ApiClient.callPathAsync('/--/api/v2/versions'),
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
    requestOptions: ?Object = {},
    returnEntireResponse: boolean = false
  ): Promise<any> {
    let url =
      _apiBaseUrl() +
      '/' +
      encodeURIComponent(methodName) +
      '/' +
      encodeURIComponent(JSON.stringify(args));
    return _callMethodAsync(url, method, requestBody, requestOptions, returnEntireResponse);
  }

  static async callPathAsync(
    path: string,
    method: ?string,
    requestBody: ?Object,
    requestOptions: ?Object = {}
  ) {
    let url = _rootBaseUrl() + path;
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
    const { sdkVersions } = await ApiClient.versionsAsync();
    return sdkVersions;
  }

  static async turtleSdkVersionsAsync() {
    const { turtleSdkVersions } = await ApiClient.versionsAsync();
    return turtleSdkVersions;
  }

  static async downloadAsync(url, outputPath, options = {}, progressFunction, retryFunction) {
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
