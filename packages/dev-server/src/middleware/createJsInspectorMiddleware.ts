import type { NextHandleFunction } from 'connect';
import fs from 'fs-extra';
import type { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';
import open from 'open';
import path from 'path';
import { TLSSocket } from 'tls';
import { URL } from 'url';

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

export default function createJsInspectorMiddleware(): NextHandleFunction {
  return async function (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void) {
    const { origin, searchParams } = new URL(req.url ?? '/', getRequestBase(req));
    const applicationId = searchParams.get('applicationId');
    if (!applicationId) {
      res.writeHead(400).end('Missing applicationId');
      return;
    }

    const target = await queryInspectorTargetAsync(origin, applicationId);
    if (!target) {
      res.writeHead(404).end('Unable to find inspector target from metro-inspector-proxy');
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
    } else if (req.method === 'POST' || req.method === 'PUT') {
      // To update devtoolsFrontendRev, find the full commit hash in the url:
      // https://chromium.googlesource.com/chromium/src.git/+log/refs/tags/{CHROME_VERSION}/chrome/VERSION
      //
      // 1. Replace {CHROME_VERSION} with the target chrome version
      // 2. Click the first log item in the webpage
      // 3. The full commit hash is the desired revision
      const devtoolsFrontendRev = 'e3cd97fc771b893b7fd1879196d1215b622c2bed'; // Chrome 90.0.4430.212

      const urlBase = `https://chrome-devtools-frontend.appspot.com/serve_rev/@${devtoolsFrontendRev}/inspector.html`;
      const ws = target.webSocketDebuggerUrl.replace('ws://[::]:', 'localhost:');
      const url = `${urlBase}?experiments=true&v8only=true&ws=${encodeURIComponent(ws)}`;
      launchChromiumAsync(url);
      res.end();
    } else {
      res.writeHead(405);
    }
  };
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

  return target;
}

function getRequestBase(req: IncomingMessage): string {
  const scheme =
    req.socket instanceof TLSSocket && req.socket.encrypted === true ? 'https' : 'http';
  const host = req.headers.host;
  return `${scheme}:${host}`;
}

async function launchChromiumAsync(url: string): Promise<void> {
  // For dev-client connecting metro in LAN, the request to fetch sourcemaps may be blocked by Chromium
  // with insecure-content (https page send xhr for http resource).
  // Adding `--allow-running-insecure-content` to overcome this limitation
  // without users manually allow insecure-content in site settings.
  // However, if there is existing chromium browser process, the argument will not take effect.
  // We also pass a `--user-data-dir=` as temporary profile and force chromium to create new browser process.
  const tmpDir = require('temp-dir');
  const tempProfileDir = fs.mkdtempSync(path.join(tmpDir, 'chromium-for-inspector-'));
  const launchArgs = [
    '--allow-running-insecure-content',
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-startup-window',
    '--no-default-browser-check',
  ];

  try {
    const result = await open(url, {
      app: {
        name: open.apps.chrome,
        arguments: launchArgs,
      },
      newInstance: true,
      wait: true,
    });

    if (result.exitCode !== 0) {
      await open(url, {
        app: {
          name: open.apps.edge,
          arguments: launchArgs,
        },
        newInstance: true,
        wait: true,
      });
    }
  } finally {
    await fs.remove(tempProfileDir);
  }
}
