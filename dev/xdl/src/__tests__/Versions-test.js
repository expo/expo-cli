'use strict';

jest.mock('analytics-node');
jest.mock('fs');
jest.mock('../Env');
jest.mock('request');

const request = require('request');
const Versions = require('../Versions');

request.__setMockResponse({
  body: {
    iosVersion: '1.6.0',
    androidVersion: '1.6.0',
    sdkVersions: {
      '5.0.0': {
        expoReactNativeTag: 'sdk-5.0.0',
        facebookReactNativeVersion: '0.24.0',
      },
      '6.0.0': {
        expoReactNativeTag: 'sdk-6.0.0',
        facebookReactNativeVersion: '0.27.0',
      },
      '7.0.0': {
        expoReactNativeTag: 'sdk-7.0.0',
        facebookReactNativeVersion: '0.27.0',
      },
    },
  },
});

describe('facebookReactNativeVersionsAsync', () => {
  it('checks list of versions is correct', async () => {
    let facebookReactNativeVersions = await Versions.facebookReactNativeVersionsAsync();
    expect(facebookReactNativeVersions).toEqual(['0.24.0', '0.27.0']);
  });
});

describe('facebookReactNativeVersionToExpoVersionAsync', () => {
  it('returns expo version when available', async () => {
    let expoVersion = await Versions.facebookReactNativeVersionToExpoVersionAsync(
      '0.24.0'
    );
    expect(expoVersion).toEqual('5.0.0');
  });

  it('returns newest expo version when multiple versions exist', async () => {
    let expoVersion = await Versions.facebookReactNativeVersionToExpoVersionAsync(
      '0.27.0'
    );
    expect(expoVersion).toEqual('7.0.0');
  });

  it('ignores patch version', async () => {
    let expoVersion = await Versions.facebookReactNativeVersionToExpoVersionAsync(
      '0.27.3'
    );
    expect(expoVersion).toEqual('7.0.0');
  });

  it('returns null when no matching version exists', async () => {
    let expoVersion = await Versions.facebookReactNativeVersionToExpoVersionAsync(
      '0.23.0'
    );
    expect(expoVersion).toEqual(null);
  });
});
