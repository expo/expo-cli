/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import http from 'http';
import launchEditor from '../launchEditor';
import { RawRequest } from '../index.types';

export default function getOpenStackFrameInEditorMiddleware({
  watchFolders,
}: {
  watchFolders: Array<string>;
}) {
  return (req: RawRequest, res: http.ServerResponse, next: (err?: any) => void) => {
    if (req.url === '/open-stack-frame') {
      const { file, lineNumber, column } = JSON.parse(req.rawBody) as {
        lineNumber: number;
        column: number;
        file: string;
      };
      launchEditor(file, lineNumber, column, watchFolders);
      res.end('OK');
    } else {
      next();
    }
  };
}
