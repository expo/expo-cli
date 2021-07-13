import { PlistObject } from '@expo/plist';
import crypto from 'crypto';
import minimatch from 'minimatch';

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

export function validateProvisioningProfile(
  plistData: PlistObject,
  {
    distCertFingerprint,
    bundleIdentifier,
  }: { distCertFingerprint: string; bundleIdentifier: string }
) {
  _ensureDeveloperCertificateIsValid(plistData, distCertFingerprint);
  _ensureBundleIdentifierIsValid(plistData, bundleIdentifier);
}

function _ensureDeveloperCertificateIsValid(plistData: any, distCertFingerprint: string) {
  const devCertBase64 = plistData.DeveloperCertificates[0];
  const devCertFingerprint = _genDerCertFingerprint(devCertBase64);
  if (devCertFingerprint !== distCertFingerprint) {
    throw new Error(
      'validateProvisioningProfile: provisioning profile is not associated with uploaded distribution certificate'
    );
  }
}

function _genDerCertFingerprint(certBase64: string) {
  const certBuffer = Buffer.from(certBase64, 'base64');
  return crypto.createHash('sha1').update(certBuffer).digest('hex').toUpperCase();
}

function _ensureBundleIdentifierIsValid(plistData: any, expectedBundleIdentifier: string) {
  const actualApplicationIdentifier = plistData.Entitlements['application-identifier'];
  const actualBundleIdentifier = /\.(.+)/.exec(actualApplicationIdentifier)?.[1];

  if (!actualBundleIdentifier || !minimatch(expectedBundleIdentifier, actualBundleIdentifier)) {
    throw new Error(
      `validateProvisioningProfile: wrong bundleIdentifier found in provisioning profile; expected: ${expectedBundleIdentifier}, found (in provisioning profile): ${actualBundleIdentifier}`
    );
  }
}
