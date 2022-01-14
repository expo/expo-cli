import type { JSONObject } from '@expo/json-file';
import axios, { AxiosRequestConfig } from 'axios';
import concat from 'concat-stream';
import FormData from 'form-data';
import QueryString from 'querystring';

import Config from './Config';
import { ApiV2Error } from './utils/errors';

const MAX_CONTENT_LENGTH = 100 /* MB */ * 1024 * 1024;
const MAX_BODY_LENGTH = 100 /* MB */ * 1024 * 1024;

// These aren't constants because some commands switch between staging and prod
function getRootBaseUrl() {
  return `${Config.api.scheme}://${Config.api.host}`;
}

function getApiBaseUrl() {
  let rootBaseUrl = getRootBaseUrl();
  if (Config.api.port) {
    rootBaseUrl += ':' + Config.api.port;
  }
  return rootBaseUrl + '/--/api/v2';
}

async function convertFormDataToBuffer(formData: FormData): Promise<{ data: Buffer }> {
  return new Promise(resolve => {
    formData.pipe(concat({ encoding: 'buffer' }, data => resolve({ data })));
  });
}

type RequestOptions = {
  httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete';
  queryParameters?: QueryParameters;
  body?: JSONObject;
  timeout?: number;
};

type UploadOptions = {
  headers: any;
  data: any;
};

type QueryParameters = { [key: string]: string | number | boolean | null | undefined };

export type ApiV2ClientOptions = {
  sessionSecret?: string;
  accessToken?: string;
};

export default class ApiV2Client {
  static exponentClient: string = 'xdl';
  public sessionSecret: string | null = null;
  public accessToken: string | null = null;

  static clientForUser(user?: ApiV2ClientOptions | null): ApiV2Client {
    if (user) {
      return new ApiV2Client(user);
    }

    return new ApiV2Client();
  }

  static setClientName(name: string) {
    ApiV2Client.exponentClient = name;
  }

  constructor(options: ApiV2ClientOptions = {}) {
    if (options.accessToken) {
      this.accessToken = options.accessToken;
    }
    if (options.sessionSecret) {
      this.sessionSecret = options.sessionSecret;
    }
  }

  public async getAsync(
    methodName: string,
    args: QueryParameters = {},
    extraOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'get',
        queryParameters: args,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  public async postAsync(
    methodName: string,
    data?: JSONObject,
    extraOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'post',
        body: data,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  public async putAsync(
    methodName: string,
    data: JSONObject,
    extraOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'put',
        body: data,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  public async patchAsync(
    methodName: string,
    data: JSONObject,
    extraOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'patch',
        body: data,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  public async deleteAsync(
    methodName: string,
    args: QueryParameters = {},
    extraOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'delete',
        queryParameters: args,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  public async uploadFormDataAsync(methodName: string, formData: FormData) {
    const options: RequestOptions = { httpMethod: 'put' };
    const { data } = await convertFormDataToBuffer(formData);
    const uploadOptions: UploadOptions = {
      headers: formData.getHeaders(),
      data,
    };
    return await this._requestAsync(methodName, options, undefined, false, uploadOptions);
  }

  // Exposed for testing
  async _requestAsync(
    methodName: string,
    options: RequestOptions,
    extraRequestOptions: Partial<RequestOptions> = {},
    returnEntireResponse: boolean = false,
    uploadOptions?: UploadOptions
  ) {
    const url = `${getApiBaseUrl()}/${methodName}`;
    let reqOptions: AxiosRequestConfig = {
      url,
      method: options.httpMethod,
      headers: {
        'Exponent-Client': ApiV2Client.exponentClient,
      },
    };

    // Handle auth method, prioritizing authorization tokens before session secrets
    if (this.accessToken) {
      reqOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.sessionSecret) {
      reqOptions.headers['Expo-Session'] = this.sessionSecret;
    }

    // Handle qs
    if (options.queryParameters) {
      reqOptions.params = options.queryParameters;
      reqOptions.paramsSerializer = QueryString.stringify;
    }

    // Handle body
    if (options.body) {
      reqOptions.data = options.body;
    }

    if (!extraRequestOptions.hasOwnProperty('timeout') && Config.isOffline) {
      reqOptions.timeout = 1;
    }

    reqOptions = merge({}, reqOptions, extraRequestOptions, uploadOptions, {
      maxContentLength: MAX_CONTENT_LENGTH,
      maxBodyLength: MAX_BODY_LENGTH,
    });

    let response;
    let result;
    try {
      response = await axios.request(reqOptions);
      result = response.data;
    } catch (e: any) {
      if (e?.response?.data?.errors?.length) {
        result = e.response.data;
      } else {
        throw e;
      }
    }

    if (result.errors?.length) {
      const responseError = result.errors[0];
      const error = new ApiV2Error(responseError.message, responseError.code);
      error.serverStack = responseError.stack;
      error.details = responseError.details;
      error.metadata = responseError.metadata;
      throw error;
    }

    return returnEntireResponse ? response : result.data;
  }
}

function merge(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        merge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
}

const isObject = (item: any) => item && typeof item === 'object' && !Array.isArray(item);
