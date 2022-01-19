/* eslint-env browser */

declare const WebSocket: any;

export default class WebSocketClient {
  client: typeof WebSocket;

  constructor(url: string) {
    this.client = new WebSocket(url);
  }

  onError(f: Function) {
    this.client.onerror = f;
  }

  onOpen(f: Function) {
    this.client.onopen = f;
  }

  onClose(f: Function) {
    this.client.onclose = f;
  }

  // call f with the message string as the first argument
  onMessage(f: Function) {
    this.client.onmessage = (e: any) => {
      f(e.data);
    };
  }
}
