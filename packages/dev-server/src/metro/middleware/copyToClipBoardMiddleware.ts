/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';

const xsel = path.join(__dirname, '../../../external/xsel');
fs.chmodSync(xsel, '0755');

/**
 * Handle the request from JS to copy contents onto host system clipboard.
 * This is only supported on Mac for now.
 */
export default function copyMiddleware(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: (err?: any) => void
) {
  if (req.url === '/copy-to-clipboard') {
    const ret = copyToClipBoard((req as http.IncomingMessage & { rawBody: string }).rawBody);
    if (!ret) {
      console.warn('Copy button is not supported on this platform!');
    }
    res.end('OK');
  } else {
    next();
  }
}

/**
 * Copy the content to host system clipboard.
 */
function copyToClipBoard(content: string) {
  switch (process.platform) {
    case 'darwin': {
      const child = spawn('pbcopy', []);
      child.stdin.end(Buffer.from(content, 'utf8'));
      return true;
    }
    case 'win32': {
      const child = spawn('clip', []);
      child.stdin.end(Buffer.from(content, 'utf8'));
      return true;
    }
    case 'linux': {
      const child = spawn(xsel, ['--clipboard', '--input']);
      child.stdin.end(Buffer.from(content, 'utf8'));
      return true;
    }
    default:
      return false;
  }
}
