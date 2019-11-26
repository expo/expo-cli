/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import http from 'http';
import openBrowser from 'react-dev-utils/openBrowser';
import { RawRequest } from '../index.types';

export default function openURLMiddleware(
  req: RawRequest,
  res: http.ServerResponse,
  next: (err?: any) => void
) {
  if (req.url === '/open-url') {
    const { url } = JSON.parse(req.rawBody);
    console.log(`Opening ${url}...`);
    openBrowser(url);
    res.end('OK');
  } else {
    next();
  }
}
