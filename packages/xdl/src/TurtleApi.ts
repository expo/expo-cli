import { JSONObject, JSONValue } from '@expo/json-file';
import axios, { AxiosRequestConfig } from 'axios';
import concat from 'concat-stream';
import fs from 'fs-extra';
import idx from 'idx';
import merge from 'lodash/merge';
import QueryString from 'querystring';
import { URL } from 'url';

import Config from './Config';
import FormData from './tools/FormData';

const apiBaseUrl = `${Config.turtleApi.scheme}://${Config.turtleApi.host}:${Config.turtleApi.port}`;

export class TurtleApiError extends Error {
  readonly name = 'TurtleApiError';

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

type QueryParameters = { [key: string]: string | number | boolean | null | undefined };

type TurtleApiClientOptions = {
  sessionSecret: string;
};

export default class TurtleApiClient {
  sessionSecret: string;

  static clientForUser(sessionSecret: string): TurtleApiClient {
    return new TurtleApiClient({ sessionSecret });
  }

  constructor(options: TurtleApiClientOptions) {
    this.sessionSecret = options.sessionSecret;
  }

  async getAsync(
    methodName: string,
    args: QueryParameters = {},
    extraOptions?: Partial<RequestOptions>
  ) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'get',
        queryParameters: args,
      },
      extraOptions
    );
  }

  async postAsync(methodName: string, data?: any, extraOptions?: Partial<RequestOptions>) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'post',
        body: data,
      },
      extraOptions
    );
  }

  async putAsync(methodName: string, data: JSONObject, extraOptions?: Partial<RequestOptions>) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'put',
        body: data,
      },
      extraOptions
    );
  }

  async deleteAsync(methodName: string, extraOptions?: Partial<RequestOptions>) {
    return this._requestAsync(
      methodName,
      {
        httpMethod: 'delete',
      },
      extraOptions
    );
  }

  async _requestAsync(
    methodName: string,
    options: RequestOptions,
    extraRequestOptions?: Partial<RequestOptions>
  ) {
    const formattedUrl = new URL(methodName, apiBaseUrl);

    let reqOptions: AxiosRequestConfig = {
      url: formattedUrl.href,
      method: options.httpMethod,
      headers: {
        'Expo-Session': this.sessionSecret || null,
      },
    };

    if (options.queryParameters) {
      reqOptions.params = options.queryParameters;
      reqOptions.paramsSerializer = QueryString.stringify;
    }

    if (options.body) {
      reqOptions.data = options.body;
    }

    reqOptions = merge({}, reqOptions, extraRequestOptions);

    return await this.handleRequest(reqOptions);
  }

  async uploadFile(tarPath: string) {
    const formattedUrl = new URL('upload', apiBaseUrl);

    const projectFormData = new FormData();
    projectFormData.append('file', fs.createReadStream(tarPath));
    const convertedFormData = await this.convertFormDataToBuffer(projectFormData);
    const { data } = convertedFormData;
    const headers = projectFormData.getHeaders();

    const reqOptions: AxiosRequestConfig = {
      method: 'post',
      url: formattedUrl.href,
      data,
      headers,
      maxContentLength: data.byteLength,
    };

    if (this.sessionSecret) {
      reqOptions.headers['Expo-Session'] = this.sessionSecret;
    }

    return await this.handleRequest(reqOptions);
  }

  async handleRequest(reqOptions: AxiosRequestConfig) {
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
      const responseError = result.errors[0];
      const error = new TurtleApiError(responseError.message, responseError.code);
      error.serverStack = responseError.stack;
      error.details = responseError.details;
      throw error;
    }

    return result;
  }

  async convertFormDataToBuffer(formData: FormData): Promise<{ data: Buffer }> {
    return new Promise(resolve => {
      formData.pipe(concat({ encoding: 'buffer' }, data => resolve({ data })));
    });
  }
}
