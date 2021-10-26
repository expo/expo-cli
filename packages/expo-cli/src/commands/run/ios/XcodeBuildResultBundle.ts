import plist from '@expo/plist';
import spawnAsync from '@expo/spawn-async';
import * as fs from 'fs-extra';
import * as path from 'path';
import { inspect } from 'util';

import Log from '../../../log';

const SupportedStorageBackend = 'fileBacked2';
const SupportedStorageCompression = 'standard';
const SupportedMajorVersion = 3;

async function loadResultBundle(resultBundlePath: string, id: string): Promise<any> {
  const { stdout } = await spawnAsync('xcrun', [
    'xcresulttool',
    'get',
    '--format',
    'json',
    '--path',
    resultBundlePath,
    '--id',
    id,
  ]);
  return JSON.parse(stdout);
}

function getInt(root: any, name: string): number {
  if (root[name]['_type']['_name'] !== 'Int') {
    throw Error(`Cannot get ${name}; expected type Int but got ${root[name]['_type']}`);
  }
  return parseInt(root[name]['_value'], 10);
}

function getString(root: any, name: string): string {
  if (root[name]['_type']['_name'] !== 'String') {
    throw Error(`Cannot get ${name}; expected type String but got ${root[name]['_type']}`);
  }
  return root[name]['_value'];
}

function getDate(root: any, name: string): Date {
  if (root[name]['_type']['_name'] !== 'Date') {
    throw Error(`Cannot get ${name}; expected type Date but got ${root[name]['_type']}`);
  }
  return new Date(root[name]['_value']);
}

function getArray(root: any, name: string): any[] {
  if (root[name]['_type']['_name'] !== 'Array') {
    throw Error(`Cannot get ${name}; expected type Array but got ${root[name]['_type']}`);
  }
  return root[name]['_values'];
}

export class ResultMetrics {
  testsCount?: number;
  warningCount?: number;

  constructor(json: any) {
    if (json['testsCount']) {
      this.testsCount = getInt(json, 'testsCount');
    }
    if (json['warningCount']) {
      this.warningCount = getInt(json, 'warningCount');
    }
  }
}

export class ActionRecord {
  startedTime: Date;
  endedTime: Date;
  title: string;
  schemeCommandName: string;
  schemeTaskName: string;

  constructor(json: any) {
    this.startedTime = getDate(json, 'startedTime');
    this.endedTime = getDate(json, 'endedTime');
    this.title = getString(json, 'title');
    this.schemeCommandName = getString(json, 'schemeCommandName');
    this.schemeTaskName = getString(json, 'schemeTaskName');
  }
}

export class DocumentLocation {
  concreteTypeName: string;
  url: string;

  constructor(json: any) {
    this.concreteTypeName = getString(json, 'concreteTypeName');
    this.url = getString(json, 'url');
  }
}

export class IssueSummary {
  issueType: string;
  message: string;
  documentLocationInCreatingWorkspace?: DocumentLocation;

  constructor(json: any) {
    this.issueType = getString(json, 'issueType');
    this.message = getString(json, 'message');

    if (json['documentLocationInCreatingWorkspace']) {
      this.documentLocationInCreatingWorkspace = new DocumentLocation(
        json['documentLocationInCreatingWorkspace']
      );
    }
  }
}

export class ResultIssueSummaries {
  warningSummaries?: IssueSummary[];

  constructor(json: any) {
    if (json['warningSummaries']) {
      this.warningSummaries = [];
      for (const item of getArray(json, 'warningSummaries')) {
        if (item['_type']['_name'] === 'IssueSummary') {
          this.warningSummaries.push(new IssueSummary(item));
        }
      }
    }
  }
}

export class ActionsInvocationRecord {
  actions?: ActionRecord[];
  issues?: ResultIssueSummaries;
  metrics?: ResultMetrics;

  constructor(json: any) {
    if (json['actions']) {
      this.actions = [];
      for (const action of getArray(json, 'actions')) {
        if (action['_type']['_name'] === 'ActionRecord') {
          this.actions.push(new ActionRecord(action));
        }
      }
    }

    if (json['issues']) {
      this.issues = new ResultIssueSummaries(json['issues']);
    }

    if (json['metrics']) {
      this.metrics = new ResultMetrics(json['metrics']);
    }
  }
}

export async function parseXcodeBuildResultBundleAsync(
  resultBundlePath: string
): Promise<ActionsInvocationRecord> {
  const info = plist.parse(await fs.readFile(path.join(resultBundlePath, '/Info.plist'), 'utf-8'));

  if (info['storage']['backend'] !== SupportedStorageBackend) {
    throw Error(
      `Cannot parse results bundle: unsupported storage backend ${info['storage']['backend']}`
    );
  }

  if (info['storage']['compression'] !== SupportedStorageCompression) {
    throw Error(
      `Cannot parse results bundle: unsupported storage compression ${info['storage']['backend']}`
    );
  }

  if (info['version']['major'] !== SupportedMajorVersion) {
    throw Error(
      `Cannot parse results bundle: unsupported major version ${info['version']['major']}`
    );
  }

  const root = await loadResultBundle(resultBundlePath, info['rootId']['hash']);
  Log.log('somn:', inspect(root, { colors: true, depth: 5 }));
  if (root['_type']['_name'] !== 'ActionsInvocationRecord') {
    throw Error(`Cannot parse results bundle: unexpected root type ${root['_type']['_name']}`);
  }

  return new ActionsInvocationRecord(root);
}

// export const archiveResultBundle = async (resultBundlePath: string) => {

//   loadResultBundleNode(resultBundlePath, )

//   // const resultBundlePath = getResultBundlePath(projectRoot);
//   const archivePath = resultBundlePath + '.zip';

//   const args = [
//     '-c', // Create an archive at the destination path
//     '-k', // Create a PKZip archive
//     '--keepParent', // Embed the parent directory name src in dst_archive.
//     resultBundlePath, // Source
//     archivePath, // Destination
//   ];

//   try {
//     await spawnAsync('ditto', args);
//   } catch (error) {
//     console.error(error);
//     return null;
//   }

//   return archivePath;
// };
