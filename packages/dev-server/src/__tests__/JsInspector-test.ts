import { ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import open from 'open';

import { openJsInspector, queryInspectorAppAsync } from '../JsInspector';
import type { MetroInspectorProxyApp } from '../JsInspector';
import { METRO_INSPECTOR_RESPONSE_FIXTURE } from '../__tests__/fixtures/metroInspectorResponse';

jest.mock('fs-extra');
jest.mock('node-fetch');
jest.mock('open');
jest.mock('rimraf');
jest.mock('temp-dir', () => '/tmp');

const { Response } = jest.requireActual('node-fetch');

describe(openJsInspector, () => {
  it('should open browser for PUT request with given app', async () => {
    const mockOpen = open as jest.MockedFunction<typeof open>;
    mockOpen.mockImplementation(
      (target: string): Promise<ChildProcess> => {
        expect(target).toMatch(
          /^https:\/\/chrome-devtools-frontend\.appspot\.com\/serve_rev\/@.+\/inspector.html/
        );
        const result: Partial<ChildProcess> = { exitCode: 0 };
        return Promise.resolve(result as ChildProcess);
      }
    );

    const app: MetroInspectorProxyApp = JSON.parse(METRO_INSPECTOR_RESPONSE_FIXTURE)[0];
    openJsInspector(app);
  });
});

describe(queryInspectorAppAsync, () => {
  it('should return specific app entity for given appId', async () => {
    const appId = 'io.expo.test.devclient';
    const entities = JSON.parse(METRO_INSPECTOR_RESPONSE_FIXTURE) as { [key: string]: string }[];
    const entity = entities.find(object => object.description === appId);

    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(METRO_INSPECTOR_RESPONSE_FIXTURE)));

    const result = await queryInspectorAppAsync('http://localhost:8081', appId);
    expect(result).toEqual(entity);
  });
});
