import { getNameFromConfig, readConfigJsonAsync } from '@expo/config';
import internalIp from 'internal-ip';
import openBrowser from 'react-dev-utils/openBrowser';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';

import { printInstructions } from './createWebpackCompiler';
import { DevServer, Protocol, WebpackSettings } from './Webpack.types';

function getIP(): string {
  return internalIp.v4.sync() || '127.0.0.1';
}

export default class WebpackInstance {
  static instances: { [projectRoot: string]: WebpackInstance } = {};

  static get(projectRoot: string): WebpackInstance | null {
    return WebpackInstance.instances[projectRoot];
  }

  static create(options: any): WebpackInstance {
    const instance = new WebpackInstance(options);
    WebpackInstance.instances[options.projectRoot] = instance;
    return instance;
  }

  static protocolFromBool(isHTTPS: boolean): Protocol {
    return isHTTPS ? 'https' : 'http';
  }

  static async getProjectNameAsync(projectRoot: string): Promise<string> {
    const { exp } = await readConfigJsonAsync(projectRoot, true);
    const { webName } = getNameFromConfig(exp);
    return webName;
  }

  readonly projectRoot: string;
  readonly https: boolean;
  readonly host: string;
  readonly port: number;
  readonly server: DevServer;

  readonly urls: Urls;
  readonly useYarn: boolean;
  readonly appName: string;
  readonly nonInteractive: boolean;

  constructor(options: any) {
    this.projectRoot = options.projectRoot;

    this.https = options.https || false;
    this.host = options.host || getIP();
    this.port = options.port;
    this.server = options.server;

    this.urls = options.urls;
    this.useYarn = options.useYarn;
    this.appName = options.appName;
    this.nonInteractive = options.nonInteractive;
  }

  stop() {
    this.server.close();
  }

  getServer(): DevServer {
    return this.server;
  }

  getSettings(): WebpackSettings {
    return {
      server: this.server,
      https: this.https,
      host: this.host,
      port: this.port,
      url: this.url,
      protocol: this.protocol,
    };
  }

  get protocol(): Protocol {
    return WebpackInstance.protocolFromBool(this.https);
  }

  get url(): string {
    return `${this.protocol}://${this.host}:${this.port}`;
  }

  openInBrowser(): boolean {
    return openBrowser(this.url);
  }

  printInstructions(options: any = {}) {
    printInstructions(this.projectRoot, {
      appName: this.appName,
      urls: this.urls,
      showInDevtools: false,
      showHelp: false,
      ...options,
    });
  }
}
