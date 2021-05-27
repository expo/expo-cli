import { ChildProcess } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';
import open from 'open';
import { URL } from 'url';

import createJsInspectorMiddleware from '../createJsInspectorMiddleware';

jest.mock('fs-extra');
jest.mock('node-fetch');
jest.mock('open');
jest.mock('rimraf');
jest.mock('temp-dir', () => '/tmp');

const { Response } = jest.requireActual('node-fetch');

describe('createJsInspectorMiddleware', () => {
  it('should return specific app entity for GET request with given applicationId', async () => {
    const appId = 'io.expo.test.devclient';
    const entities = JSON.parse(RESPONSE_FIXTURE) as { [key: string]: string }[];
    const entity = entities.find(object => object.description === appId);

    const req = createRequest(`http://localhost:8081/inspector?applicationId=${appId}`);
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = createJsInspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 200, JSON.stringify(entity));
  });

  it('should return 404 for GET request with nonexistent applicationId', async () => {
    const req = createRequest('http://localhost:8081/inspector?applicationId=nonExistentApp');
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = createJsInspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 404);
  });

  it('should return 400 for GET request without parameters', async () => {
    const req = createRequest('http://localhost:8081/inspector');
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = createJsInspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 400);
  });

  it('should open browser for PUT request with given applicationId', async () => {
    const appId = 'io.expo.test.devclient';
    const req = createRequest(`http://localhost:8081/inspector?applicationId=${appId}`, 'PUT');
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

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

    const middlewareAsync = createJsInspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 200);
  });

  const RESPONSE_FIXTURE = JSON.stringify([
    {
      description: 'io.expo.test.devclient',
      devtoolsFrontendUrl:
        'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=%5B%3A%3A%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D3',
      faviconUrl: 'https://reactjs.org/favicon.ico',
      id: '0-3',
      title: 'Hermes React Native',
      type: 'node',
      vm: 'Hermes',
      webSocketDebuggerUrl: 'ws://[::]:8081/inspector/debug?device=0&page=3',
    },
    {
      description: "don't use",
      devtoolsFrontendUrl:
        'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=%5B%3A%3A%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D0%26page%3D-1',
      faviconUrl: 'https://reactjs.org/favicon.ico',
      id: '0--1',
      title: 'React Native Experimental (Improved Chrome Reloads)',
      type: 'node',
      vm: "don't use",
      webSocketDebuggerUrl: 'ws://[::]:8081/inspector/debug?device=0&page=-1',
    },
    {
      description: 'io.expo.test.hermes',
      devtoolsFrontendUrl:
        'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=%5B%3A%3A%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D1%26page%3D1',
      faviconUrl: 'https://reactjs.org/favicon.ico',
      id: '1-1',
      title: 'Hermes React Native',
      type: 'node',
      vm: 'Hermes',
      webSocketDebuggerUrl: 'ws://[::]:8081/inspector/debug?device=1&page=1',
    },
    {
      description: "don't use",
      devtoolsFrontendUrl:
        'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=%5B%3A%3A%5D%3A8081%2Finspector%2Fdebug%3Fdevice%3D1%26page%3D-1',
      faviconUrl: 'https://reactjs.org/favicon.ico',
      id: '1--1',
      title: 'React Native Experimental (Improved Chrome Reloads)',
      type: 'node',
      vm: "don't use",
      webSocketDebuggerUrl: 'ws://[::]:8081/inspector/debug?device=1&page=-1',
    },
  ]);
});

function createRequest(requestUrl: string, method?: 'GET' | 'POST' | 'PUT'): IncomingMessage {
  const url = new URL(requestUrl);
  const req: Partial<IncomingMessage> = {
    method: method || 'GET',
    headers: {
      host: url.host,
    },
    url: `${url.pathname}${url.search}`,
  };
  return req as IncomingMessage;
}

interface MockedResponse extends Partial<ServerResponse> {
  end: jest.Mock;
  writeHead: jest.Mock;
  write: jest.Mock;
}

function createMockedResponse(): MockedResponse {
  return {
    end: jest.fn(),
    writeHead: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
  };
}

function expectMockedResponse(res: MockedResponse, status: number, body?: string) {
  if (status !== 200) {
    expect(res.writeHead.mock.calls[0][0]).toBe(status);
  }
  if (body) {
    expect(res.end.mock.calls[0][0]).toBe(body);
  }
}
