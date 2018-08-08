/**
 * @flow
 */

import _ from 'lodash';
import ExtendableError from 'es6-error';
import QueryString from 'querystring';
import axios from 'axios';
import idx from 'idx';

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

export class ApiV2Error extends ExtendableError {
  code: string;
  details: Object;
  serverStack: ?string;

  constructor(message: string, code: string = 'UNKNOWN') {
    super(message);
    this.code = code;
    this._isApiError = true;
  }
}

type RequestOptions = {
  httpMethod: 'get' | 'post' | 'put',
  queryParameters?: ?QueryParameters,
  body?: ?Object,
  json?: boolean,
};

type QueryParameters = { [key: string]: ?(string | number | boolean) };

type APIV2ClientOptions = {
  sessionSecret?: string,
};

type UserOrSession = ?{ sessionSecret: ?string };

export default class ApiV2Client {
  sessionSecret: ?string = null;

  static clientForUser({ sessionSecret } = {}): ApiV2Client {
    if (sessionSecret) {
      return new ApiV2Client({ sessionSecret });
    }

    return new ApiV2Client();
  }

  constructor(options: APIV2ClientOptions = {}) {
    if (options.sessionSecret) {
      this.sessionSecret = options.sessionSecret;
    }
  }

  async getAsync(
    methodName: string,
    args: QueryParameters = {},
    extraOptions: Object = {},
    returnEntireResponse: boolean = false
  ): Promise<*> {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'get',
        queryParameters: args,
        json: true,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  async postAsync(
    methodName: string,
    data: Object = {},
    extraOptions: Object = {},
    returnEntireResponse: boolean = false
  ): Promise<*> {
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
    data: Object = {},
    extraOptions: Object = {},
    returnEntireResponse: boolean = false
  ): Promise<*> {
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
    data: Object = {},
    extraOptions: Object = {},
    returnEntireResponse: boolean = false
  ): Promise<*> {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'delete',
        body: data,
      },
      extraOptions,
      returnEntireResponse
    );
  }

  async _requestAsync(
    methodName: string,
    options: RequestOptions,
    extraRequestOptions: Object,
    returnEntireResponse: boolean = false
  ): Promise<*> {
    const url = `${_apiBaseUrl()}/${methodName}`;
    let reqOptions: Object = {
      url,
      method: options.httpMethod,
      headers: {
        'Exponent-Client': 'xdl',
      },
      json: typeof options.json !== 'undefined' ? options.json : false,
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

    reqOptions = _.merge({}, reqOptions, extraRequestOptions);
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
