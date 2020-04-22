#!/usr/bin/env node
import * as Scheme from '@expo/config/build/ios/Scheme';
import plist, { PlistObject } from '@expo/plist';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import fs from 'fs';
import { sync } from 'glob';
import { join } from 'path';

import { Options } from './Options';

export function isAvailable(projectRoot: string): boolean {
  const reactNativeIos = sync(join(projectRoot, 'ios', '*.xcodeproj'));
  const currentIos = sync(join(projectRoot, '*.xcodeproj'));
  return !!currentIos.length || !!reactNativeIos.length;
}

export async function addAsync({
  uri,
  infoPath,
  projectRoot,
  dryRun,
}: Pick<Options, 'uri' | 'infoPath' | 'projectRoot' | 'dryRun'>): Promise<boolean> {
  const infoPlistPath = infoPath ?? getConfigPath(projectRoot);

  let config = readConfig(infoPlistPath);

  if (Scheme.hasScheme(uri, config)) {
    console.log(
      chalk.yellow(
        `\u203A iOS: URI scheme "${uri}" already exists in Info.plist at: ${infoPlistPath}`
      )
    );
    return false;
  }

  config = Scheme.appendScheme(uri, config);

  if (dryRun) {
    console.log(chalk.magenta('Write plist to: ', infoPlistPath));
    console.log(formatConfig(config));
    return false;
  }
  writeConfig(infoPlistPath, config);
  return true;
}

export async function removeAsync({
  uri,
  infoPath,
  projectRoot,
  dryRun,
}: Pick<Options, 'uri' | 'infoPath' | 'projectRoot' | 'dryRun'>): Promise<boolean> {
  const infoPlistPath = infoPath ?? getConfigPath(projectRoot);

  let config = readConfig(infoPlistPath);

  if (!Scheme.hasScheme(uri, config)) {
    console.log(
      chalk.yellow(
        `\u203A iOS: URI scheme "${uri}" does not exist in Info.plist at: ${infoPlistPath}`
      )
    );
    return false;
  }

  config = Scheme.removeScheme(uri, config);

  if (dryRun) {
    console.log(chalk.magenta('Write plist to: ', infoPlistPath));
    console.log(formatConfig(config));
    return false;
  }
  writeConfig(infoPlistPath, config);
  return true;
}

export async function openAsync({ uri }: Pick<Options, 'uri'>): Promise<void> {
  await spawnAsync('xcrun', ['simctl', 'openurl', 'booted', uri], {
    stdio: 'inherit',
  });
}

export async function getAsync({
  projectRoot,
  infoPath,
}: Pick<Options, 'projectRoot' | 'infoPath'>): Promise<string[]> {
  const infoPlistPath = infoPath ?? getConfigPath(projectRoot);
  const rawPlist = fs.readFileSync(infoPlistPath, 'utf8');
  const plistObject = plist.parse(rawPlist) as PlistObject;
  const schemes = Scheme.getSchemesFromPlist(plistObject);
  return schemes;
}

export function getConfigPath(projectRoot: string): string {
  // TODO: Figure out how to avoid using the Tests info.plist

  const rnInfoPlistPaths = sync(join(projectRoot, 'ios', '*', 'Info.plist'));
  if (rnInfoPlistPaths.length) {
    return rnInfoPlistPaths[0];
  }
  const infoPlistPaths = sync(join(projectRoot, '*', 'Info.plist'));
  return infoPlistPaths[0];
}

function readConfig(path: string): any {
  // Read Plist as source
  const rawPlist = fs.readFileSync(path, 'utf8');
  return { ...plist.parse(rawPlist) };
}

function formatConfig(plistObject: any): string {
  // attempt to match default Info.plist format
  const format = { pretty: true, indent: `\t` };
  const xml = plist.build(plistObject, format);
  return xml;
}

function writeConfig(path: string, plistObject: any) {
  fs.writeFileSync(path, formatConfig(plistObject));
}
