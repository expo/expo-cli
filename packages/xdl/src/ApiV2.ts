import { JSONObject, JSONValue } from '@expo/json-file';
import axios, { AxiosRequestConfig } from 'axios';
import concat from 'concat-stream';
import ExtendableError from 'es6-error';
import FormData from 'form-data';
import idx from 'idx';
import merge from 'lodash/merge';
import QueryString from 'querystring';

import Config from './Config';

// These aren't constants because some commands switch between staging and prod
function _rootBaseUrl() {
  return `${Config.api.scheme}://${Config.api.host}`;
}

function _apiBaseUrl() {
  let rootBaseUrl = _rootBaseUrl();
  if (Config.api.port) {
    rootBaseUrl += ':' + Config.api.port;
  }
  return rootBaseUrl + '/--/api/v2';
}

async function _convertFormDataToBuffer(formData: FormData): Promise<{ data: Buffer }> {
  return new Promise(resolve => {
    formData.pipe(concat({ encoding: 'buffer' }, data => resolve({ data })));
  });
}

export class ApiV2Error extends ExtendableError {
  code: string;
  details?: JSONValue;
  serverStack?: string;
  readonly _isApiError = true;

  constructor(message: string, code: string = 'UNKNOWN') {
    super(message);
    this.code = code;
  }
}

type RequestOptions = {
  httpMethod: 'get' | 'post' | 'put' | 'delete';
  queryParameters?: QueryParameters;
  body?: JSONObject;
};

type UploadOptions = {
  headers: any;
  data: any;
};

type QueryParameters = { [key: string]: string | number | boolean | null | undefined };

type APIV2ClientOptions = {
  sessionSecret?: string;
};

export default class ApiV2Client {
  static exponentClient: string = 'xdl';
  sessionSecret: string | null = null;

  static clientForUser(user?: APIV2ClientOptions | null): ApiV2Client {
    if (user && user.sessionSecret) {
      return new ApiV2Client({ sessionSecret: user.sessionSecret });
    }

    return new ApiV2Client();
  }

  static setClientName(name: string) {
    ApiV2Client.exponentClient = name;
  }

  constructor(options: APIV2ClientOptions = {}) {
    if (options.sessionSecret) {
      this.sessionSecret = options.sessionSecret;
    }
  }

  async getAsync(
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

  async postAsync(
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

  async putAsync(
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

  async deleteAsync(
    methodName: string,
    extraOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'delete',
      },
      extraOptions,
      returnEntireResponse
    );
  }

  async uploadFormDataAsync(methodName: string, formData: FormData) {
    const options: RequestOptions = { httpMethod: 'put' };
    const { data } = await _convertFormDataToBuffer(formData);
    const uploadOptions: UploadOptions = {
      headers: formData.getHeaders(),
      data,
    };
    return await this._requestAsync(methodName, options, undefined, false, uploadOptions);
  }

  async _requestAsync(
    methodName: string,
    options: RequestOptions,
    extraRequestOptions?: Partial<RequestOptions>,
    returnEntireResponse: boolean = false,
    uploadOptions?: UploadOptions
  ) {
    const url = `${_apiBaseUrl()}/${methodName}`;
    let reqOptions: AxiosRequestConfig = {
      url,
      method: options.httpMethod,
      headers: {
        'Exponent-Client': ApiV2Client.exponentClient,
      },
    };

    if (this.sessionSecret) {
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

    reqOptions = merge({}, reqOptions, extraRequestOptions, uploadOptions);

    let response;
    let result;
    try {
      response = await axios.request(reqOptions);
      result = response.data;
    } catch (e) {
      const maybeErrorData = idx(e, _ => _.response.data.errors.length);
      if (maybeErrorData) {
        result = e.response.data;
      } else {
        throw e;
      }
    }

    if (result.errors && result.errors.length) {
      let responseError = result.errors[0];
      let error = new ApiV2Error(responseError.message, responseError.code);
      error.serverStack = responseError.stack;
      error.details = responseError.details;
      throw error;
    }

    return returnEntireResponse ? response : result.data;
  }
}
