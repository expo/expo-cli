import fetch from 'node-fetch';
import open, { openApp } from 'open';
import path from 'path';

export interface MetroInspectorProxyApp {
  description: string;
  devtoolsFrontendUrl: string;
  faviconUrl: string;
  id: string;
  title: string;
  type: 'node';
  vm: 'Hermes' | "don't use";
  webSocketDebuggerUrl: string;
}

export function openJsInspector(app: MetroInspectorProxyApp) {
  // To update devtoolsFrontendRev, find the full commit hash in the url:
  // https://chromium.googlesource.com/chromium/src.git/+log/refs/tags/{CHROME_VERSION}/chrome/VERSION
  //
  // 1. Replace {CHROME_VERSION} with the target chrome version
  // 2. Click the first log item in the webpage
  // 3. The full commit hash is the desired revision
  const devtoolsFrontendRev = 'e3cd97fc771b893b7fd1879196d1215b622c2bed'; // Chrome 90.0.4430.212

  const urlBase = `https://chrome-devtools-frontend.appspot.com/serve_rev/@${devtoolsFrontendRev}/inspector.html`;
  const ws = app.webSocketDebuggerUrl.replace('ws://[::]:', 'localhost:');
  const url = `${urlBase}?panel=sources&v8only=true&ws=${encodeURIComponent(ws)}`;
  launchChromiumAsync(url);
}

export async function queryInspectorAppAsync(
  metroServerOrigin: string,
  appId: string
): Promise<MetroInspectorProxyApp | null> {
  const apps = await queryAllInspectorAppsAsync(metroServerOrigin);
  return apps.find(app => app.description === appId) ?? null;
}

export async function queryAllInspectorAppsAsync(
  metroServerOrigin: string
): Promise<MetroInspectorProxyApp[]> {
  const resp = await fetch(`${metroServerOrigin}/json/list`);
  const apps: MetroInspectorProxyApp[] = transformApps(await resp.json());
  // Only use targets with better reloading support
  return apps.filter(app => app.title === 'React Native Experimental (Improved Chrome Reloads)');
}

// The description of `React Native Experimental (Improved Chrome Reloads)` target is `don't use` from metro.
// This function tries to transform the unmeaningful description to appId
function transformApps(apps: MetroInspectorProxyApp[]): MetroInspectorProxyApp[] {
  const deviceIdToAppId: Record<string, string> = {};

  for (const app of apps) {
    if (app.description !== "don't use") {
      const deviceId = app.id.split('-')[0];
      const appId = app.description;
      deviceIdToAppId[deviceId] = appId;
    }
  }

  return apps.map(app => {
    if (app.description === "don't use") {
      const deviceId = app.id.split('-')[0];
      app.description = deviceIdToAppId[deviceId] ?? app.description;
    }
    return app;
  });
}

async function launchChromiumAsync(url: string): Promise<void> {
  // For dev-client connecting metro in LAN, the request to fetch sourcemaps may be blocked by Chromium
  // with insecure-content (https page send xhr for http resource).
  // Adding `--allow-running-insecure-content` to overcome this limitation
  // without users manually allow insecure-content in site settings.
  // However, if there is existing chromium browser process, the argument will not take effect.
  // We also pass a `--user-data-dir=` as temporary profile and force chromium to create new browser process.
  const tmpDir = require('temp-dir');
  const tempProfileDir = path.join(tmpDir, 'expo-inspector');
  const launchArgs = [
    `--app=${url}`,
    '--allow-running-insecure-content',
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-startup-window',
    '--no-default-browser-check',
  ];

  const result = await openApp(open.apps.chrome, {
    arguments: launchArgs,
    newInstance: true,
    wait: true,
  });

  if (result.exitCode !== 0) {
    await openApp(open.apps.edge, {
      arguments: launchArgs,
      newInstance: true,
      wait: true,
    });
  }
}
