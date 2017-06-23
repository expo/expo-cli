/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import ExtendableError from 'es6-error';
import request from 'request';

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
};

type QueryParameters = { [key: string]: ?(string | number | boolean) };

type ErrorWithResponseBody = Error & {
  responseBody?: any,
};

type APIV2ClientOptions = {
  idToken?: string,
  accessToken?: string,
};

export default class ApiV2Client {
  idToken: ?string = null;
  accessToken: ?string = null;

  static clientForUser(user: ?User): ApiV2Client {
    if (user) {
      return new ApiV2Client({
        accessToken: user.accessToken,
        idToken: user.idToken,
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
  }

  async getAsync(
    methodName: string,
    args: QueryParameters = {},
    extraOptions: Object = {}
  ): Promise<*> {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'get',
        queryParameters: args,
      },
      extraOptions
    );
  }

  async postAsync(
    methodName: string,
    data: Object = {},
    extraOptions: Object = {}
  ): Promise<*> {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'post',
        body: data,
      },
      extraOptions
    );
  }

  async putAsync(
    methodName: string,
    data: Object = {},
    extraOptions: Object = {}
  ): Promise<*> {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'put',
        body: data,
      },
      extraOptions
    );
  }

  async _requestAsync(
    methodName: string,
    options: RequestOptions,
    extraRequestOptions: Object
  ): Promise<*> {
    const url = `${API_BASE_URL}/${methodName}`;

    let reqOptions: Object = {
      url,
      method: options.httpMethod,
      headers: {
        'Exponent-Client': 'xdl',
      },
    };

    if (this.idToken) {
      reqOptions.headers['Authorization'] = `Bearer ${this.idToken}`;
    }

    if (this.accessToken) {
      reqOptions.headers['Exp-Access-Token'] = this.accessToken;
    }

    // Handle qs
    if (options.queryParameters) {
      reqOptions.qs = options.queryParameters;
    }

    // Handle body
    if (options.body) {
      reqOptions.body = options.body;
      reqOptions.json = true;
    }

    reqOptions = _.merge({}, reqOptions, extraRequestOptions);

    let response;
    let result;
    try {
      response = await request.promise(reqOptions);
      result = response.body;
    } catch (e) {
      const error: ErrorWithResponseBody = new Error(
        `There was a problem understanding the server. Please try again.`
      );
      error.responseBody = result;
      logger.error(error);
      throw error;
    }

    if (!result || typeof result !== 'object') {
      let error: ErrorWithResponseBody = new Error(
        `There was a problem understanding the server.`
      );
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

    return result.data;
  }
}
