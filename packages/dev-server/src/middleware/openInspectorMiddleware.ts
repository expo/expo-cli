import { spawn } from 'child_process';
import type { HandleFunction } from 'connect';
import electron from 'electron';
import type { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';
import { TLSSocket } from 'tls';
import { URL } from 'url';

export default function openInspectorMiddleware(): HandleFunction {
  return async function (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void) {
    if (!req.url) {
      res.writeHead(400);
      return;
    }
    const { origin, searchParams } = new URL(req.url, getRequestBase(req));
    const applicationId = searchParams.get('applicationId');
    if (!applicationId) {
      res.writeHead(400).end('Missing applicationId');
      return;
    }

    const inspectorUrl = await queryInspectorUrl(origin, applicationId);
    if (!inspectorUrl) {
      res.writeHead(404).end('Unable to find inspector URL from metro-inspector-proxy.');
      return;
    }

    const appPath = require.resolve('../inspector-app');
    // The imported electron from nodejs process is path string to electron executable
    spawn((electron as unknown) as string, [appPath, inspectorUrl]);
    res.end();
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

async function queryInspectorUrl(origin: string, appId: string): Promise<string | null> {
  const resp = await fetch(`${origin}/json/list`);
  const apps: MetroInspectorProxyApp[] = await resp.json();

  let url = null;
  for (const app of apps) {
    if (app.description === appId && app.vm !== "don't use") {
      url = app.devtoolsFrontendUrl;
      break;
    }
  }

  if (url?.startsWith('chrome-devtools://')) {
    // metro-inspector-proxy returns chrome-devtools:// scheme which not supported by Electron or Chrome.
    // We replace the scheme as devtools:// instead.
    url = url.substr(7);
  }
  return url;
}

function getRequestBase(req: IncomingMessage): string {
  const scheme =
    req.socket instanceof TLSSocket && req.socket.encrypted === true ? 'https' : 'http';
  const host = req.headers.host;
  return `${scheme}:${host}`;
}
