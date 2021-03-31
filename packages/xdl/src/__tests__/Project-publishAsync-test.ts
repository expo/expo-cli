import spawnAsync from '@expo/spawn-async';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { copyFileSync, ensureDirSync } from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { LogRecord, ProjectUtils, publishAsync, UserManager } from '../internal';

jest.dontMock('fs');
jest.dontMock('resolve-from');

jest.mock('../project/Doctor', () => ({
  async validateWithNetworkAsync() {
    const Doctor = jest.requireActual('../project/Doctor');
    return Doctor.NO_ISSUES;
  },
}));

function mockApiV2Response(data: any, config: AxiosRequestConfig): AxiosResponse {
  return {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    config,
    data: {
      data,
    },
  };
}

const mockAssetMetadata = {
  exists: true,
  lastModified: new Date('2020-01-01').toISOString(),
  contentLength: 1000,
  contentType: 'image/png',
};

jest.mock('axios', () => ({
  async request(options: AxiosRequestConfig) {
    const { URL } = jest.requireActual('url');
    const axios = jest.requireActual('axios');

    const { hostname, pathname } = new URL(options.url);

    if (
      hostname === '127.0.0.1' ||
      // Allow downloading the configuration schema during test
      pathname.startsWith('/--/api/v2/project/configuration/schema/')
    ) {
      return axios.request(options);
    } else if (hostname !== 'exp.host') {
      throw new Error(`Test tried to make a request to unknown host ${hostname}`);
    }

    const methodAndPath = options.method.toUpperCase() + ' ' + pathname;
    switch (methodAndPath) {
      case 'POST /--/api/v2/auth/loginAsync':
        return mockApiV2Response({ sessionSecret: 'fake-session-secret' }, options);
      case 'POST /--/api/v2/auth/userProfileAsync':
        return mockApiV2Response(
          {
            id: '7e577e57-7e57-7e57-7e57-c0ffeec0ffee',
            user_id: '7e577e57-7e57-7e57-7e57-c0ffeec0ffee',
            username: 'testing',
            nickname: 'testing',
            picture: 'https://www.gravatar.com/avatar/23463b99b62a72f26ed677cc556c44e8',
          },
          options
        );
      case 'POST /--/api/v2/assets/metadata':
        return mockApiV2Response(
          {
            metadata: Object.fromEntries(options.data.keys.map(key => [key, mockAssetMetadata])),
          },
          options
        );
      case 'PUT /--/api/v2/publish/new':
        return mockApiV2Response(
          {
            url: 'https://test.exp.host/@testing/publish-test-app',
            ids: ['1', '2'],
          },
          options
        );
      default:
        throw new Error(
          'Test tried to make a request to unmocked endpoint (' + methodAndPath + ')'
        );
    }
  },
}));

describe('publishAsync', () => {
  const projectRoot = path.join(temporary.directory(), 'publish-test-app');

  beforeAll(async () => {
    jest.setTimeout(240e3);
    ensureDirSync(projectRoot);
    for (const filename of ['App.js', 'app.json', 'package.json']) {
      copyFileSync(
        path.join(__dirname, 'fixtures/publish-test-app', filename),
        path.join(projectRoot, filename)
      );
    }
    await spawnAsync('yarnpkg', [], { cwd: projectRoot });
    ProjectUtils.attachLoggerStream(projectRoot, {
      stream: {
        write: (chunk: LogRecord) => {
          if (!/bundle_transform_progressed/.test(chunk.msg)) {
            process.stderr.write(chunk.msg);
          }
        },
      },
      type: 'raw',
    });
  });

  xit('publishes the project to exp.host', async () => {
    await UserManager.loginAsync('user-pass', {
      username: 'testing',
      password: 'fake-password',
    });
    process.env.EXPO_USE_DEV_SERVER = 'true';
    const result = await publishAsync(projectRoot, { resetCache: true });
    expect(result.url).toBe('https://test.exp.host/@testing/publish-test-app');

    process.env.EXPO_USE_DEV_SERVER = 'false';
    const resultOld = await publishAsync(projectRoot, { resetCache: true });
    expect(resultOld.url).toBe('https://test.exp.host/@testing/publish-test-app');
  }, 60000 /* this takes longer to run sometimes, give it a long timeout */);
});
