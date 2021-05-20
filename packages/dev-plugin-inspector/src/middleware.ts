import { spawn } from 'child_process';
import type { NextHandleFunction } from 'connect';
import electron from 'electron';
import type { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';
import open from 'open';
import { TLSSocket } from 'tls';
import { URL } from 'url';

const ENDPOINT = '/inspector';

export default function InspectorMiddleware(): NextHandleFunction {
  return async function (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void) {
    if (!req.url || !req.url.startsWith(ENDPOINT)) {
      next();
      return;
    }
    const { pathname, origin, searchParams } = new URL(req.url, getRequestBase(req));
    if (pathname !== ENDPOINT) {
      next();
      return;
    }

    const applicationId = searchParams.get('applicationId');
    if (!applicationId) {
      res.writeHead(400).end('Missing applicationId');
      return;
    }

    const target = await queryInspectorTargetAsync(origin, applicationId);
    if (!target) {
      res.writeHead(404).end('Unable to find inspector target from metro-inspector-proxy.');
      return;
    }

    if (req.method === 'GET') {
      const data = JSON.stringify(target);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-cache',
        'Content-Length': data.length.toString(),
      });
      res.end(data);
    } else if (req.method === 'POST') {
      const urlBase =
        'https://chrome-devtools-frontend.appspot.com/serve_rev/@e3cd97fc771b893b7fd1879196d1215b622c2bed/inspector.html';
      const ws = target.webSocketDebuggerUrl.replace('ws://[::]:', 'localhost:');
      const url = `${urlBase}?experiments=true&v8only=true&ws=${encodeURIComponent(ws)}`;
      open(url, { app: { name: 'google chrome' } });
      res.end();
    } else if (req.method === 'PUT') {
      const appPath = require.resolve('./electron-app');
      if (!appPath) {
        throw new Error('Missing electron-app file. \nPlease reinstall this module and try again.');
      }

      // The imported electron from nodejs process is path string to electron executable
      spawn((electron as unknown) as string, [appPath, target.devtoolsFrontendUrl]);
      res.end();
    } else {
      res.writeHead(405);
    }
  };
}

interface MetroInspectorProxyApp {
  description: string;
  devtoolsFrontendUrl: string;
  faviconUrl: string;
  id: string;
  title: string;
  type: 'node';
  vm: 'Hermes' | "don't use";
  webSocketDebuggerUrl: string;
}

async function queryInspectorTargetAsync(
  origin: string,
  appId: string
): Promise<MetroInspectorProxyApp | null> {
  const resp = await fetch(`${origin}/json/list`);
  const apps: MetroInspectorProxyApp[] = await resp.json();

  let target: MetroInspectorProxyApp | null = null;
  for (const app of apps) {
    if (app.description === appId && app.vm !== "don't use") {
      target = app;
      break;
    }
  }

  if (target?.devtoolsFrontendUrl.startsWith('chrome-devtools://')) {
    // metro-inspector-proxy returns chrome-devtools:// scheme which not supported by Electron or Chrome.
    // We replace the scheme as devtools:// instead.
    target.devtoolsFrontendUrl = target.devtoolsFrontendUrl.substr(7);
  }
  return target;
}

function getRequestBase(req: IncomingMessage): string {
  const scheme =
    req.socket instanceof TLSSocket && req.socket.encrypted === true ? 'https' : 'http';
  const host = req.headers.host;
  return `${scheme}:${host}`;
}
