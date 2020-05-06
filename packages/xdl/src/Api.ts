import axios, { AxiosRequestConfig, Canceler } from 'axios';
import concat from 'concat-stream';
import ExtendableError from 'es6-error';
import FormData from 'form-data';
import fs from 'fs-extra';
import isString from 'lodash/isString';
import path from 'path';

import Config from './Config';
import * as ConnectionStatus from './ConnectionStatus';
import * as Extract from './Extract';
import * as Session from './Session';
import UserManager from './User';
import UserSettings from './UserSettings';
import XDLError from './XDLError';
import { MAX_CONTENT_LENGTH } from './ApiV2';

const TIMER_DURATION = 30000;
const TIMEOUT = 3600000;

let exponentClient = 'xdl';

type HttpMethod = 'get' | 'post' | 'put' | 'delete';
type RequestOptions = AxiosRequestConfig & { formData?: FormData };

class ApiError extends ExtendableError {
  code: string;
  readonly _isApiError = true;
  serverError: any;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
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
  url: string,
  method: HttpMethod = 'get',
  requestBody: any,
  requestOptions: RequestOptions,
  returnEntireResponse = false
) {
  const clientId = await Session.clientIdAsync();
  const session = await UserManager.getSessionAsync();
  const skipValidationToken = process.env['EXPO_SKIP_MANIFEST_VALIDATION_TOKEN'];

  let headers: any = {
    'Exp-ClientId': clientId,
    'Exponent-Client': exponentClient,
  };

  if (skipValidationToken) {
    headers['Exp-Skip-Manifest-Validation-Token'] = skipValidationToken;
  }

  if (session) {
    headers['Expo-Session'] = session.sessionSecret;
  }

  let options: AxiosRequestConfig = {
    url,
    method,
    headers,
    maxContentLength: MAX_CONTENT_LENGTH,
  };

  if (requestBody) {
    options = {
      ...options,
      data: requestBody,
    };
  }

  if (requestOptions.formData) {
    let { formData, ...rest } = requestOptions;
    let convertedFormData = await _convertFormDataToBuffer(formData);
    let { data } = convertedFormData;
    options.headers = {
      ...options.headers,
      ...formData.getHeaders(),
    };
    options = { ...options, data, ...rest };
  } else {
    options = { ...options, ...requestOptions };
  }

  if (!requestOptions.hasOwnProperty('timeout') && ConnectionStatus.isOffline()) {
    options.timeout = 1;
  }

  let response = await axios.request(options);
  if (!response) {
    throw new Error('Unexpected error: Request failed.');
  }
  let responseBody = response.data;
  var responseObj;
  if (isString(responseBody)) {
    try {
      responseObj = JSON.parse(responseBody);
    } catch (e) {
      throw new XDLError(
        'INVALID_JSON',
        'Invalid JSON returned from API: ' + e + '. Response body: ' + responseBody
      );
    }
  } else {
    responseObj = responseBody;
  }
  if (responseObj.err) {
    let err = new ApiError(
      responseObj.code || 'API_ERROR',
      'API Response Error: ' + responseObj.err
    );
    err.serverError = responseObj.err;
    throw err;
  } else {
    return returnEntireResponse ? response : responseObj;
  }
}

async function _convertFormDataToBuffer(formData: FormData): Promise<{ data: Buffer }> {
  return new Promise(resolve => {
    formData.pipe(concat({ encoding: 'buffer' }, data => resolve({ data })));
  });
}

type ProgressCallback = (progressPercentage: number) => void;
type RetryCallback = (cancel: Canceler) => void;

async function _downloadAsync(
  url: string,
  outputPath: string,
  progressFunction?: ProgressCallback,
  retryFunction?: RetryCallback
) {
  let promptShown = false;
  let currentProgress = 0;

  let { cancel, token } = axios.CancelToken.source();

  let warningTimer = setTimeout(() => {
    if (retryFunction) {
      retryFunction(cancel);
    }
    promptShown = true;
  }, TIMER_DURATION);

  const tmpPath = `${outputPath}.download`;
  const config: AxiosRequestConfig = {
    timeout: TIMEOUT,
    responseType: 'stream',
    cancelToken: token,
  };
  let response = await axios(url, config);
  await new Promise(resolve => {
    let totalDownloadSize = response.data.headers['content-length'];
    let downloadProgress = 0;
    response.data
      .on('data', (chunk: Buffer) => {
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

export default class ApiClient {
  static host: string = Config.api.host;
  static port: number = Config.api.port || 80;

  static setClientName(name: string) {
    exponentClient = name;
  }

  static async callMethodAsync(
    methodName: string,
    args: any,
    method?: HttpMethod,
    requestBody?: any,
    requestOptions: RequestOptions = {},
    returnEntireResponse: boolean = false
  ) {
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
    method?: HttpMethod,
    requestBody?: any,
    requestOptions: RequestOptions = {}
  ) {
    let url = _rootBaseUrl() + path;
    return _callMethodAsync(url, method, requestBody, requestOptions);
  }

  static async downloadAsync(
    url: string,
    outputPath: string,
    { extract = false } = {},
    progressFunction?: ProgressCallback,
    retryFunction?: RetryCallback
  ): Promise<void> {
    if (extract) {
      let dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
      let tmpPath = path.join(dotExpoHomeDirectory, 'tmp-download-file');
      await _downloadAsync(url, tmpPath, progressFunction);
      await Extract.extractAsync(tmpPath, outputPath);
      fs.removeSync(tmpPath);
    } else {
      await _downloadAsync(url, outputPath, progressFunction, retryFunction);
    }
  }
}
