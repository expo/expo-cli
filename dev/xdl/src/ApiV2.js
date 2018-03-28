/**
 * @flow
 */

import _ from 'lodash';
import ExtendableError from 'es6-error';
import QueryString from 'querystring';
import axios from 'axios';
import idx from 'idx';

import Config from './Config';

import logger from './Logger';

import type { User } from './User';

let ROOT_BASE_URL = `${Config.api.scheme}://${Config.api.host}`;
if (Config.api.port) {
  ROOT_BASE_URL += ':' + Config.api.port;
}
const API_BASE_URL = ROOT_BASE_URL + '/--/api/v2';

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

type ErrorWithResponseBody = Error & {
  responseBody?: any,
};

type APIV2ClientOptions = {
  idToken?: string,
  accessToken?: string,
  sessionSecret?: string,
};

export default class ApiV2Client {
  idToken: ?string = null;
  accessToken: ?string = null;
  sessionSecret: ?string = null;

  static clientForUser(user: ?User): ApiV2Client {
    if (user) {
      return new ApiV2Client({
        accessToken: user.accessToken,
        idToken: user.idToken,
        sessionSecret: user.sessionSecret,
      });
    }

    return new ApiV2Client();
  }

  constructor(options: APIV2ClientOptions = {}) {
    if (options.idToken) {
      this.idToken = options.idToken;
    }

    if (options.accessToken) {
      this.accessToken = options.accessToken;
    }

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

  async _requestAsync(
    methodName: string,
    options: RequestOptions,
    extraRequestOptions: Object,
    returnEntireResponse: boolean = false
  ): Promise<*> {
    const url = `${API_BASE_URL}/${methodName}`;
    let reqOptions: Object = {
      url,
      method: options.httpMethod,
      headers: {
        'Exponent-Client': 'xdl',
      },
      json: typeof options.json !== 'undefined' ? options.json : false,
    };

    if (this.idToken) {
      reqOptions.headers['Authorization'] = `Bearer ${this.idToken}`;
    }

    if (this.accessToken) {
      reqOptions.headers['Exp-Access-Token'] = this.accessToken;
    }

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
      // axios errors on 400's, pass this case to better error handling downstream
      const maybeErrorData = idx(e, _ => _.response.data.errors.length);
      if (maybeErrorData) {
        result = e.response.data;
      } else if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.code === 'ETIMEDOUT') {
        // surface network failures
        throw e;
      } else {
        const error: ErrorWithResponseBody = new Error(
          `There was a problem understanding the server. Please try again.`
        );
        error.responseBody = result;
        logger.error(error);
        throw error;
      }
    }

    if (!result || typeof result !== 'object') {
      let error: ErrorWithResponseBody = new Error(`There was a problem understanding the server.`);
      error.responseBody = result;
      throw error;
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
