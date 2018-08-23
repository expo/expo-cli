'use strict';

const { join } = require('path');
const { version } = require('./package');

const TRAVELING_FASTLANE = `traveling-fastlane-${version}-linux-x86_64`;

module.exports = () => {
  let p = join.bind(null, __dirname, TRAVELING_FASTLANE);
  return {
    app_management: p('app_management'),
    fetch_cert: p('fetch_cert'),
    fetch_new_provisioning_profile: p('fetch_new_provisioning_profile'),
    fetch_push_cert: p('fetch_push_cert'),
    validate_apple_certs: p('validate_apple_certs'),
    validate_apple_credentials: p('validate_apple_credentials'),
    validate_apple_push_certs: p('validate_apple_push_certs'),
  };
};
