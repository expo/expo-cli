import plist from '@expo/plist';
import spawnAsync from '@expo/spawn-async';
import assert from 'assert';
import fs from 'fs';
import * as path from 'path';

import Log from '../../../../log';
import { ActionsInvocationRecord, ActivityLogSection } from './XCResult.types';

const SupportedStorageBackend = 'fileBacked2';
const SupportedStorageCompression = 'standard';
const SupportedMajorVersion = 3;

async function xcrunAsync(...args: string[]) {
  Log.debug(`  xcrun ${args.join(' ')}`);
  return await spawnAsync('xcrun', args);
}

async function loadResultBundle<T = any>(
  resultBundlePath: string,
  id: string,
  type: string
): Promise<T> {
  const { stdout } = await xcrunAsync(
    'xcresulttool',
    'get',
    '--format',
    'json',
    '--path',
    resultBundlePath,
    '--id',
    id
  );
  const parsed = JSON.parse(stdout);

  if (parsed?.['_type']?._name !== type) {
    throw Error(
      `Cannot parse results bundle: unexpected root type ${parsed?.['_type']?.['_name']}`
    );
  }

  return transformXCResults(parsed) as T;
}

export function transformXCResults(input: any): any {
  assert(input._type?._name, 'Missing `_type.name` on input JSON: ' + input);

  const {
    _type: { _name: type },
    ...rest
  } = input;

  if (type === 'Array') {
    return rest._values.map(transformXCResults);
  } else if (type === 'String') {
    return rest._value;
  } else if (type === 'Bool') {
    return rest._value === 'true';
  } else if (type === 'Int' || type === 'Double') {
    return Number(rest._value);
  } else if (type === 'Date') {
    return new Date(rest._value);
  }

  return Object.entries(rest).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: transformXCResults(value),
    }),
    {}
  );
}

// actions._values[0].buildResult.logRef.id._value -> parse
export async function getActivityLogSectionAsync(
  resultBundlePath: string,
  data: ActionsInvocationRecord
) {
  if (!data.actions) return null;

  // Search for an action like `title: 'Build "yolo62"'`, there can be multiple actions in the case of cleaning then building (archiving, etc.).
  const buildActions = data.actions.filter(action => action.title.startsWith('Build '));
  const actionsToIterate = buildActions.length > 0 ? buildActions : data.actions;
  for (const action of actionsToIterate) {
    const lazyId = action.buildResult?.logRef?.id;
    if (lazyId) {
      Log.debug(`Load ActivityLogSection with ID: ${lazyId}`);
      return loadResultBundle<ActivityLogSection>(resultBundlePath, lazyId, 'ActivityLogSection');
    }
  }
  return null;
}

async function readXCResultFileAsync(resultBundlePath: string) {
  const info = plist.parse(
    await fs.promises.readFile(path.join(resultBundlePath, '/Info.plist'), 'utf-8')
  );

  assert(
    info['storage']['backend'] === SupportedStorageBackend,
    `Cannot parse Xcode results bundle: unsupported storage backend ${info['storage']['backend']}`
  );
  assert(
    info['storage']['compression'] === SupportedStorageCompression,
    `Cannot parse Xcode results bundle: unsupported storage compression ${info['storage']['backend']}`
  );
  assert(
    info['version']['major'] === SupportedMajorVersion,
    `Cannot parse Xcode results bundle: unsupported major version ${info['version']['major']}`
  );
  return info;
}

export async function parseXCResultFileAsync(
  resultBundlePath: string
): Promise<ActionsInvocationRecord> {
  const info = await readXCResultFileAsync(resultBundlePath);

  const lazyId = info['rootId']['hash'];

  return loadResultBundle<ActionsInvocationRecord>(
    resultBundlePath,
    lazyId,
    'ActionsInvocationRecord'
  );
}

export function getTempDirectory(projectRoot: string, buildId: string) {
  return path.join(projectRoot, `./.expo/ios/run/${buildId}`);
}

export function getResultBundlePath(projectRoot: string, id?: string) {
  return path.join(
    getTempDirectory(projectRoot, id ?? require('uuid').v4()),
    `/ResultBundle.xcresult`
  );
}
