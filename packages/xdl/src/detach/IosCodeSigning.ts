import crypto from 'crypto';
import path from 'path';

import _ from 'lodash';
import fs from 'fs-extra';
import glob from 'glob-promise';
import plist from 'plist';
import minimatch from 'minimatch';

import { getP12CertFingerprint } from './PKCS12Utils';
import { spawnAsyncThrowError } from './ExponentTools';
export { findP12CertSerialNumber } from './PKCS12Utils';

export type IPABuilderParams = {
  provisioningProfilePath: string;
  certPath: string;
  certPassword?: string;
  appUUID: string;
  keychainPath: string;
  bundleIdentifier: string;
  teamID: string;
  manifest: any;
  workspacePath: string;
  clientBuild?: boolean;
};

export async function ensureCertificateValid({
  certPath,
  certPassword,
  teamID,
}: Pick<IPABuilderParams, 'certPath' | 'certPassword' | 'teamID'>): Promise<string> {
  const certData = await fs.readFile(certPath);
  const fingerprint = getP12CertFingerprint(certData, certPassword!);
  const identities = await _findIdentitiesByTeamID(teamID);
  const isValid = identities.indexOf(fingerprint) !== -1;
  if (!isValid) {
    throw new Error(`codesign ident not present in find-identity: ${fingerprint}\n${identities}`);
  }
  return fingerprint;
}

async function _findIdentitiesByTeamID(teamID: string): Promise<string> {
  const { output } = await spawnAsyncThrowError(
    'security',
    ['find-identity', '-v', '-s', `(${teamID})`],
    {
      stdio: 'pipe',
    }
  );
  return output.join('');
}

export function validateProvisioningProfile(
  plistData: plist.PlistValue,
  {
    distCertFingerprint,
    bundleIdentifier,
  }: { distCertFingerprint: string; bundleIdentifier: string }
): void {
  _ensureDeveloperCertificateIsValid(plistData, distCertFingerprint);
  _ensureBundleIdentifierIsValid(plistData, bundleIdentifier);
}

function _ensureDeveloperCertificateIsValid(plistData: any, distCertFingerprint: string): void {
  const devCertBase64 = plistData.DeveloperCertificates[0];
  const devCertFingerprint = _genDerCertFingerprint(devCertBase64);
  if (devCertFingerprint !== distCertFingerprint) {
    throw new Error(
      'validateProvisioningProfile: provisioning profile is not associated with uploaded distribution certificate'
    );
  }
}

function _genDerCertFingerprint(certBase64: string): string {
  const certBuffer = Buffer.from(certBase64, 'base64');
  return crypto
    .createHash('sha1')
    .update(certBuffer)
    .digest('hex')
    .toUpperCase();
}

function _ensureBundleIdentifierIsValid(plistData: any, expectedBundleIdentifier: string): void {
  const actualApplicationIdentifier = plistData.Entitlements['application-identifier'];
  const actualBundleIdentifier = (/\.(.+)/.exec(actualApplicationIdentifier) || [])[1];

  if (!minimatch(expectedBundleIdentifier, actualBundleIdentifier)) {
    throw new Error(
      `validateProvisioningProfile: wrong bundleIdentifier found in provisioning profile; expected: ${expectedBundleIdentifier}, found (in provisioning profile): ${actualBundleIdentifier}`
    );
  }
}

export type ExportOptionsPlist = {
  bundleIdentifier: string;
  provisioningProfileUUID: string;
  exportMethod: string;
  teamID: string;
};

export async function writeExportOptionsPlistFile(
  plistPath: string,
  data: ExportOptionsPlist
): Promise<void> {
  const toWrite = createExportOptionsPlist(data);
  await fs.writeFile(plistPath, toWrite);
}

const createExportOptionsPlist = ({
  bundleIdentifier,
  provisioningProfileUUID,
  exportMethod,
  teamID,
}: ExportOptionsPlist): string => {
  const disableBitcodeCompiling = `<key>uploadBitcode</key>
    <false/>
    <key>compileBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <false/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>method</key>
    <string>${exportMethod}</string>
    <key>teamID</key>
    <string>${teamID}</string>
    <key>provisioningProfiles</key>
    <dict>
      <key>${bundleIdentifier}</key>
      <string>${provisioningProfileUUID}</string>
    </dict>
    ${exportMethod === 'ad-hoc' || exportMethod === 'enterprise' ? disableBitcodeCompiling : ''}
  </dict>
</plist>`;
};

type BuildIPAOptions = {
  ipaPath: string;
  workspacePath: string;
  archivePath: string;
  codeSignIdentity: string;
  exportOptionsPlistPath: string;
  plistData: plist.PlistValue;
  keychainPath: string;
  exportMethod: string;
};

export async function buildIPA(
  {
    ipaPath,
    workspacePath,
    archivePath,
    codeSignIdentity,
    exportOptionsPlistPath,
    keychainPath,
    exportMethod,
  }: BuildIPAOptions,
  credentials: FastlaneCredentials,
  client = false
) {
  if (client) {
    await spawnAsyncThrowError(
      'xcodebuild',
      [
        '-exportArchive',
        '-archivePath',
        archivePath,
        '-exportOptionsPlist',
        exportOptionsPlistPath,
        '-exportPath',
        // @ts-ignore: Property 'Dir' does not exist on type 'typeof import("path")'
        path.Dir(ipaPath),
        `OTHER_CODE_SIGN_FLAGS="--keychain ${keychainPath}"`,
      ],
      {
        env: { ...process.env, CI: '1' },
      }
    );
  } else {
    await runFastlane(
      credentials,
      [
        'gym',
        '-n',
        path.basename(ipaPath),
        '--workspace',
        workspacePath,
        '--archive_path',
        archivePath,
        '--skip_build_archive',
        'true',
        '-i',
        codeSignIdentity,
        '--export_options',
        exportOptionsPlistPath,
        '--export_method',
        exportMethod,
        '--export_xcargs',
        `OTHER_CODE_SIGN_FLAGS="--keychain ${keychainPath}"`,
        '-o',
        path.dirname(ipaPath),
        '--verbose',
      ],
      { buildPhase: 'building and signing IPA' }
    );
  }
}

export const resolveExportMethod = (plistData: any): string => {
  if (plistData.ProvisionedDevices) {
    return 'ad-hoc';
  } else if (plistData.ProvisionsAllDevices === true) {
    return 'enterprise';
  }
  return 'app-store';
};

const entitlementTransferRules = [
  'com.apple.developer.associated-domains',
  'com.apple.developer.healthkit',
  'com.apple.developer.homekit',
  'com.apple.developer.icloud-container-identifiers',
  'com.apple.developer.icloud-services',
  'com.apple.developer.in-app-payments',
  'com.apple.developer.networking.vpn.api',
  'com.apple.developer.ubiquity-container-identifiers',
  'com.apple.developer.ubiquity-kvstore-identifier',
  'com.apple.external-accessory.wireless-configuration',
  'com.apple.security.application-groups',
  'inter-app-audio',
  'keychain-access-groups',
];

const blacklistedEntitlementKeysWithoutICloud = [
  'com.apple.developer.icloud-container-environment',
  'com.apple.developer.icloud-container-identifiers',
  'com.apple.developer.icloud-services',
  'com.apple.developer.ubiquity-container-identifiers',
  'com.apple.developer.ubiquity-kvstore-identifier',
];

const blacklistedEntitlementKeys = [
  'com.apple.developer.icloud-container-development-container-identifiers',
  'com.apple.developer.restricted-resource-mode',
  'inter-app-audio',
  'com.apple.developer.homekit',
  'com.apple.developer.healthkit',
  'com.apple.developer.in-app-payments',
  'com.apple.developer.maps',
  'com.apple.external-accessory.wireless-configuration',
];

const icloudContainerEnvKey = 'com.apple.developer.icloud-container-environment';

export type EntitlementsFileOptions = {
  generatedEntitlementsPath: string;
  plistData: any;
  archivePath: string;
  manifest: IPABuilderParams['manifest'];
};

export async function createEntitlementsFile({
  generatedEntitlementsPath,
  plistData,
  archivePath,
  manifest,
}: EntitlementsFileOptions): Promise<void> {
  const decodedProvisioningProfileEntitlements = plistData.Entitlements;

  const entitlementsPattern = path.join(archivePath, 'Products/Applications/*.app/*.entitlements');
  const entitlementsPaths = await glob(entitlementsPattern);
  if (entitlementsPaths.length === 0) {
    throw new Error("Didn't find any generated entitlements file in archive.");
  } else if (entitlementsPaths.length !== 1) {
    throw new Error('Found more than one entitlements file.');
  }
  const archiveEntitlementsPath = entitlementsPaths[0];
  const archiveEntitlementsRaw = await fs.readFile(archiveEntitlementsPath);
  const archiveEntitlementsData = _.attempt(plist.parse, String(archiveEntitlementsRaw));
  if (_.isError(archiveEntitlementsData)) {
    throw new Error(`Error when parsing plist: ${archiveEntitlementsData.message}`);
  }

  const entitlements = { ...decodedProvisioningProfileEntitlements };

  entitlementTransferRules.forEach(rule => {
    // @ts-ignore: The right-hand side of an 'in' expression must be of type 'any', an object type or a type parameter.
    if (rule in archiveEntitlementsData) {
      // @ts-ignore
      entitlements[rule] = archiveEntitlementsData[rule];
    }
  });

  let generatedEntitlements: any = _.omit(entitlements, blacklistedEntitlementKeys);

  if (!manifest.ios.usesIcloudStorage) {
    generatedEntitlements = _.omit(generatedEntitlements, blacklistedEntitlementKeysWithoutICloud);
  } else {
    const ubiquityKvKey = 'com.apple.developer.ubiquity-kvstore-identifier';
    if (generatedEntitlements[ubiquityKvKey]) {
      const teamId = generatedEntitlements[ubiquityKvKey].split('.')[0];
      generatedEntitlements[ubiquityKvKey] = `${teamId}.${manifest.ios.bundleIdentifier}`;
    }
    generatedEntitlements['com.apple.developer.icloud-services'] = ['CloudDocuments'];
  }
  if (!manifest.ios.associatedDomains) {
    generatedEntitlements = _.omit(generatedEntitlements, 'com.apple.developer.associated-domains');
  }
  if (!manifest.ios.usesAppleSignIn) {
    generatedEntitlements = _.omit(generatedEntitlements, 'com.apple.developer.applesignin');
  }
  if (generatedEntitlements[icloudContainerEnvKey]) {
    const envs = generatedEntitlements[icloudContainerEnvKey].filter(
      (i: any) => i === 'Production'
    );
    generatedEntitlements[icloudContainerEnvKey] = envs;
  }

  const generatedEntitlementsPlistData = _.attempt(plist.build, generatedEntitlements);
  await fs.writeFile(generatedEntitlementsPath, generatedEntitlementsPlistData, {
    mode: 0o755,
  });
  const { output } = await spawnAsyncThrowError(
    '/usr/libexec/PlistBuddy',
    ['-x', '-c', 'Print', generatedEntitlementsPath],
    {
      stdio: 'pipe',
    }
  );
  const plistDataReformatted = output.join('');
  await fs.writeFile(generatedEntitlementsPath, plistDataReformatted, {
    mode: 0o755,
  });
}

export type ResignIPAOptions = {
  codeSignIdentity: string;
  entitlementsPath: string;
  provisioningProfilePath: string;
  sourceIpaPath: string;
  destIpaPath: string;
  keychainPath: string;
};

export async function resignIPA(
  {
    codeSignIdentity,
    entitlementsPath,
    provisioningProfilePath,
    sourceIpaPath,
    destIpaPath,
    keychainPath,
  }: ResignIPAOptions,
  credentials: FastlaneCredentials
): Promise<void> {
  await spawnAsyncThrowError('cp', ['-rf', sourceIpaPath, destIpaPath]);
  await runFastlane(
    credentials,
    [
      'sigh',
      'resign',
      '--verbose',
      '--entitlements',
      entitlementsPath,
      '--signing_identity',
      codeSignIdentity,
      '--keychain_path',
      keychainPath,
      '--provisioning_profile',
      provisioningProfilePath,
      destIpaPath,
    ],
    { buildPhase: 'building and signing IPA' }
  );
}

type FastlaneCredentials = Pick<IPABuilderParams, 'teamID'>;

async function runFastlane(
  { teamID }: FastlaneCredentials,
  fastlaneArgs: string[],
  loggerFields: any
): Promise<void> {
  const fastlaneEnvVars = {
    FASTLANE_SKIP_UPDATE_CHECK: 1,
    FASTLANE_DISABLE_COLORS: 1,
    FASTLANE_TEAM_ID: teamID,
    CI: 1,
    LC_ALL: 'en_US.UTF-8',
  };

  await spawnAsyncThrowError('fastlane', fastlaneArgs, {
    env: {
      ...process.env,
      ...fastlaneEnvVars,
    },
    pipeToLogger: true,
    // @ts-ignore
    dontShowStdout: false,
    loggerFields,
  });
}
