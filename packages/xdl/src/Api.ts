import axios, { AxiosRequestConfig, Canceler } from 'axios';
import concat from 'concat-stream';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';

import {
  API_V2_MAX_BODY_LENGTH,
  API_V2_MAX_CONTENT_LENGTH,
  Config,
  ConnectionStatus,
  Extract,
  Session,
  UserManager,
  UserSettings,
  XDLError,
} from './internal';

const TIMER_DURATION = 30000;
const TIMEOUT = 3600000;

let exponentClient = 'xdl';

type HttpMethod = 'get' | 'post' | 'put' | 'delete';
type RequestOptions = AxiosRequestConfig & { formData?: FormData };

class ApiError extends Error {
  readonly name = 'ApiError';
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

  const headers: any = {
    'Exp-ClientId': clientId,
    'Exponent-Client': exponentClient,
  };

  if (skipValidationToken) {
    headers['Exp-Skip-Manifest-Validation-Token'] = skipValidationToken;
  }

  // Handle auth method, prioritizing authorization tokens before session secrets
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  } else if (session?.sessionSecret) {
    headers['Expo-Session'] = session.sessionSecret;
  }

  let options: AxiosRequestConfig = {
    url,
    method,
    headers,
    maxContentLength: API_V2_MAX_CONTENT_LENGTH,
    maxBodyLength: API_V2_MAX_BODY_LENGTH,
  };

  if (requestBody) {
    options = {
      ...options,
      data: requestBody,
    };
  }

  if (requestOptions.formData) {
    const { formData, ...rest } = requestOptions;
    const convertedFormData = await _convertFormDataToBuffer(formData);
    const { data } = convertedFormData;
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

  const response = await axios.request(options);
  if (!response) {
    throw new Error('Unexpected error: Request failed.');
  }
  const responseBody = response.data;
  let responseObj;
  if (typeof responseBody === 'string') {
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
    const err = new ApiError(
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

  const { cancel, token } = axios.CancelToken.source();

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
  const response = await axios(url, config);
  await new Promise<void>(resolve => {
    const totalDownloadSize = response.data.headers['content-length'];
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

/** @deprecated use ApiV2, got or GraphQL depending on use case. */
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
    const url =
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
    const url = _rootBaseUrl() + path;
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
      const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
      const tmpPath = path.join(dotExpoHomeDirectory, 'tmp-download-file');
      await _downloadAsync(url, tmpPath, progressFunction);
      await Extract.extractAsync(tmpPath, outputPath);
      fs.removeSync(tmpPath);
    } else {
      await _downloadAsync(url, outputPath, progressFunction, retryFunction);
    }
  }
}
