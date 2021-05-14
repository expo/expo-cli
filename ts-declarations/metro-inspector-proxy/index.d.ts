declare module 'metro-inspector-proxy' {
  import type { IncomingMessage, ServerResponse } from 'http';

  export class InspectorProxy {
    constructor();

    processRequest(
      request: IncomingMessage,
      response: ServerResponse,
      next: (error?: Error) => void
    );
  }
}
