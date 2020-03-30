#!/usr/bin/env node
import plist, { CFBundleTypeRole, PlistObject } from '@expo/plist';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import fs from 'fs';
import { sync } from 'glob';
import path from 'path';

import { Options } from './Options';

export function isAvailable(projectRoot: string): boolean {
  const reactNativeIos = sync(path.join(projectRoot, 'ios', '*.xcodeproj'));
  const currentIos = sync(path.join(projectRoot, '*.xcodeproj'));
  return !!currentIos.length || !!reactNativeIos.length;
}

function ensureCFBundleTypeRole(value?: string): CFBundleTypeRole {
  if (value?.toLowerCase() === 'viewer') {
    return CFBundleTypeRole.Viewer;
  }
  return CFBundleTypeRole.Editor;
}

export async function addAsync({ role, name, uri, projectRoot, dryRun }: Options): Promise<void> {
  const infoPlistPath = getConfigPath(projectRoot);
  appendPlistUriScheme(
    infoPlistPath,
    { uri, name, role: ensureCFBundleTypeRole(role) },
    true,
    dryRun
  );
}

export async function removeAsync({
  uri,
  projectRoot,
  role,
  name,
  dryRun,
}: Options): Promise<void> {
  const infoPlistPath = getConfigPath(projectRoot);

  appendPlistUriScheme(
    infoPlistPath,
    { uri, name, role: ensureCFBundleTypeRole(role) },
    false,
    dryRun
  );
}

export async function openAsync({ uri }: Options): Promise<void> {
  await spawnAsync('xcrun', ['simctl', 'openurl', 'booted', uri], {
    stdio: 'inherit',
  });
}

function getSchemesFromPlist(plistObject: PlistObject): string[] {
  if (Array.isArray(plistObject.CFBundleURLTypes)) {
    return plistObject.CFBundleURLTypes.reduce((prev, curr) => {
      if (Array.isArray(curr.CFBundleURLSchemes)) {
        return [...prev, ...curr.CFBundleURLSchemes];
      }
      return prev;
    }, []);
  }
  return [];
}

export async function getAsync({ projectRoot }: Options): Promise<string[]> {
  const infoPlistPath = getConfigPath(projectRoot);
  const rawPlist = fs.readFileSync(infoPlistPath, 'utf8');
  const plistObject = plist.parse(rawPlist) as PlistObject;
  const schemes = getSchemesFromPlist(plistObject);
  return schemes;
}

export function getConfigPath(projectRoot: string): string {
  // TODO: Figure out how to avoid using the Tests info.plist
  const rnInfoPlistPaths = sync(path.join(projectRoot, 'ios', '*', 'Info.plist'));
  if (rnInfoPlistPaths.length) {
    return rnInfoPlistPaths[0];
  }
  const infoPlistPaths = sync(path.join(projectRoot, '*', 'Info.plist'));
  return infoPlistPaths[0];
}

function appendPlistUriScheme(
  plistPath: string,
  scheme: { uri: string; name?: string; role?: CFBundleTypeRole },
  shouldAdd: boolean,
  dryRun: boolean = false
) {
  // Read Plist as source
  const rawPlist = fs.readFileSync(plistPath, 'utf8');

  const plistObject = { ...plist.parse(rawPlist) };

  if (!shouldAdd && !plistObject.CFBundleURLTypes) {
    return;
  }
  if (!plistObject.CFBundleURLTypes) plistObject.CFBundleURLTypes = [];

  const inputRole = scheme.role || 'Editor';
  const inputName = scheme.name || scheme.uri;

  if (shouldAdd) {
    if (
      plistObject.CFBundleURLTypes.some(({ CFBundleURLSchemes: schemes }: any) =>
        schemes.includes(scheme.uri)
      )
    ) {
      throw new Error(
        `iOS: URI scheme "${scheme.uri}" already exists in Info.plist at: ${plistPath}`
      );
    }
    // @ts-ignore
    plistObject.CFBundleURLTypes.push({
      CFBundleTypeRole: inputRole,
      CFBundleURLName: inputName,
      CFBundleURLSchemes: [scheme.uri],
    });
  } else {
    if (
      !plistObject.CFBundleURLTypes.some(({ CFBundleURLSchemes: schemes }: any) =>
        schemes.includes(scheme.uri)
      )
    ) {
      throw new Error(
        `iOS: URI scheme "${scheme.uri}" does not exist in the Info.plist at: ${plistPath}`
      );
    }

    plistObject.CFBundleURLTypes = plistObject.CFBundleURLTypes.map((url: any) => {
      const ind = url.CFBundleURLSchemes.indexOf(scheme.uri);
      if (ind > -1) {
        url.CFBundleURLSchemes.splice(ind, 1);
        if (url.CFBundleURLSchemes.length === 0) {
          return undefined;
        }
      }
      return url;
    }).filter(Boolean);
  }

  // attempt to match default Info.plist format
  const format = { pretty: true, indent: `\t` };

  const xml = plist.build(plistObject, format);

  if (dryRun) {
    console.log(chalk.magenta('Write plist to: ', plistPath));
    console.log(xml);
    return;
  }
  if (xml !== rawPlist) {
    fs.writeFileSync(plistPath, xml);
  }
}
