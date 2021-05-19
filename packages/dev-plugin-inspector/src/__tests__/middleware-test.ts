import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import type { NextFunction, NextHandleFunction } from 'connect';
import type { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';
import { URL } from 'url';

import InspectorMiddleware from '../middleware';

jest.mock('child_process').mock('node-fetch');

const { Response } = jest.requireActual('node-fetch');

describe('InspectorMiddleware', () => {
  it('should return specific app entity for GET /inspector with given applicationId', async () => {
    const appId = 'io.expo.test.devclient';
    const entities = JSON.parse(RESPONSE_FIXTURE) as { [key: string]: string }[];
    const entity = entities.find(object => object.description === appId);

    const req = createRequest(`http://localhost:8081/inspector?applicationId=${appId}`);
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = InspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 200, JSON.stringify(entity));
  });

  it('should return 404 for GET /inspector with nonexistent applicationId', async () => {
    const req = createRequest('http://localhost:8081/inspector?applicationId=nonExistentApp');
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = InspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 404);
  });

  it('should return 400 for GET /inspector without parameters', async () => {
    const req = createRequest('http://localhost:8081/inspector');
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = InspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    expectMockedResponse(res, 400);
  });

  it('should open electron for PUT /inspector with given applicationId', async () => {
    const appId = 'io.expo.test.devclient';
    const req = createRequest(`http://localhost:8081/inspector?applicationId=${appId}`, 'PUT');
    const res = createMockedResponse();
    const next = jest.fn();
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReturnValue(Promise.resolve(new Response(RESPONSE_FIXTURE)));

    const middlewareAsync = InspectorMiddleware();
    await middlewareAsync(req, res as ServerResponse, next);

    const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockSpawn.mockImplementation(
      (command: string, args: readonly string[], options: SpawnOptions): ChildProcess => {
        expect(command).toContain('electron');
        expect(args[1]).toMatch(/^devtools:\/\//);
        const ret = (null as unknown) as ChildProcess;
        return ret;
      }
    );
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
  expect(res.writeHead.mock.calls[0][0]).toBe(status);
}
