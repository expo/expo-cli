'use strict';

import 'instapromise';

let _ = require('lodash');
let request = require('request');

let Config = require('./Config');
let Session = require('./Session');
let UserSettings = require('./UserSettings');

function ApiError(code, message) {
  let err = new Error(message);
  err.code = code;
  err._isApiError = true;
  return err;
}

let ROOT_BASE_URL = 'http://' + Config.api.host;
if (Config.api.port) {
  ROOT_BASE_URL += ':' + Config.api.port;
}
let API_BASE_URL = ROOT_BASE_URL + '/--/api/';

async function _callMethodAsync(url, method, requestBody) {
  let clientId = await Session.clientIdAsync();
  let {username} = await UserSettings.readAsync();
  let headers = {
    'Exp-ClientId': clientId,
  };
  if (username) {
    headers['Exp-Username'] = username;
  }

  // console.log("headers=", headers);

  let options = {
    url,
    method: method || 'get',
    headers,
  };
  if (requestBody) {
    options = {
      ...options,
      body: requestBody,
      json: true,
    }
  }

  let response = await request.promise(options);
  let responseBody = response.body;
  var responseObj;
  if (_.isString(responseBody)) {
    try {
      responseObj = JSON.parse(responseBody);
    } catch (e) {
      throw new Error("Invalid JSON returned from API: " + e + ". Response body: " + responseBody);
    }
  } else {
    responseObj = responseBody;
  }
  if (responseObj.err) {
    let err = ApiError(responseObj.code || 'API_ERROR', "API Response Error: " + responseObj.err);
    err.serverError = responseObj.err;
    throw err;
  } else {
    return responseObj;
  }
}

export default class ApiClient {

  static async callMethodAsync(methodName, args, method, requestBody) {
    let url = API_BASE_URL + encodeURIComponent(methodName) + '/' +
      encodeURIComponent(JSON.stringify(args));
    return _callMethodAsync(url, method, requestBody);
  }

  static async callPathAsync(path, method, requestBody) {
    let url = ROOT_BASE_URL + path;
    return _callMethodAsync(url, method, requestBody);
  }
}

ApiClient.host = Config.api.host;
ApiClient.port = Config.api.port || 80;

module.exports = ApiClient;
