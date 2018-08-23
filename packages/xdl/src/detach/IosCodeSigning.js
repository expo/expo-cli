import forge from 'node-forge';
import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob-promise';
import plist from 'plist';
import crypto from 'crypto';

import { spawnAsyncThrowError } from './ExponentTools';

async function ensureCertificateValid({ certPath, certPassword, teamID }) {
  const certData = await fs.readFile(certPath);
  const fingerprint = _genP12CertFingerprint(certData, certPassword);
  const identities = await _findIdentitiesByTeamID(teamID);
  const isValid = identities.indexOf(fingerprint) !== -1;
  if (!isValid) {
    throw new Error(`codesign ident not present in find-identity: ${fingerprint}\n${identities}`);
  }
  return fingerprint;
}

function _genP12CertFingerprint(p12Buffer, passwordRaw) {
  const certData = _getCertData(p12Buffer, passwordRaw);
  const certAsn1 = forge.pki.certificateToAsn1(certData);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();
  return forge.md.sha1
    .create()
    .update(certDer)
    .digest()
    .toHex()
    .toUpperCase();
}

function findP12CertSerialNumber(p12Buffer, passwordRaw) {
  const certData = _getCertData(p12Buffer, passwordRaw);
  const { serialNumber } = certData;
  return serialNumber ? certData.serialNumber.replace(/^0+/, '').toUpperCase() : null;
}

function _getCertData(p12Buffer, passwordRaw) {
  if (Buffer.isBuffer(p12Buffer)) {
    p12Buffer = p12Buffer.toString('base64');
  } else if (typeof p12Buffer !== 'string') {
    throw new Error('_getCertData only takes strings and buffers.');
  }

  const password = String(passwordRaw || '');
  const p12Der = forge.util.decode64(p12Buffer);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  const certBagType = forge.pki.oids.certBag;
  const certData = _.get(p12.getBags({ bagType: certBagType }), [certBagType, 0, 'cert']);
  if (!certData) {
    throw new Error("_getCertData: couldn't find cert bag");
  }
  return certData;
}

async function _findIdentitiesByTeamID(teamID) {
  const { output } = await spawnAsyncThrowError(
    'security',
    ['find-identity', '-v', '-s', `(${teamID})`],
    {
      stdio: 'pipe',
    }
  );
  return output.join('');
}

function validateProvisioningProfile(plistData, { distCertFingerprint, bundleIdentifier }) {
  _ensureDeveloperCertificateIsValid(plistData, distCertFingerprint);
  _ensureBundleIdentifierIsValid(plistData, bundleIdentifier);
}

function _ensureDeveloperCertificateIsValid(plistData, distCertFingerprint) {
  const devCertBase64 = plistData.DeveloperCertificates[0];
  const devCertFingerprint = _genDerCertFingerprint(devCertBase64);
  if (devCertFingerprint !== distCertFingerprint) {
    throw new Error(
      'validateProvisioningProfile: provisioning profile is not associated with uploaded distribution certificate'
    );
  }
}

function _genDerCertFingerprint(certBase64) {
  const certBuffer = Buffer.from(certBase64, 'base64');
  return crypto
    .createHash('sha1')
    .update(certBuffer)
    .digest('hex')
    .toUpperCase();
}

function _ensureBundleIdentifierIsValid(plistData, expectedBundleIdentifier) {
  const actualApplicationIdentifier = plistData.Entitlements['application-identifier'];
  const actualBundleIdentifier = /\.(.+)/.exec(actualApplicationIdentifier)[1];

  if (expectedBundleIdentifier !== actualBundleIdentifier) {
    throw new Error(
      `validateProvisioningProfile: wrong bundleIdentifier found in provisioning profile; expected: ${expectedBundleIdentifier}, found (in provisioning profile): ${actualBundleIdentifier}`
    );
  }
}

async function writeExportOptionsPlistFile(plistPath, data) {
  const toWrite = createExportOptionsPlist(data);
  await fs.writeFile(plistPath, toWrite);
}

const createExportOptionsPlist = ({
  bundleIdentifier,
  provisioningProfileUUID,
  exportMethod,
  teamID,
}) => `<?xml version="1.0" encoding="UTF-8"?>
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
  </dict>
</plist>`;

async function buildIPA(
  {
    ipaPath,
    workspace,
    archivePath,
    codeSignIdentity,
    exportOptionsPlistPath,
    plistData,
    keychainPath,
    exportMethod,
  },
  credentials,
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
        path.Dir(ipaPath),
        `OTHER_CODE_SIGN_FLAGS="--keychain ${keychainPath}"`,
      ],
      {
        env: { ...process.env, CI: 1 },
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
        workspace,
        '--scheme',
        'ExpoKitApp',
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

const resolveExportMethod = plistData => {
  if (plistData.ProvisionedDevices) {
    return 'ad-hoc';
  } else if (plistData.ProvisionsAllDevices === true) {
    return 'enterprise';
  } else {
    return 'app-store';
  }
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

async function createEntitlementsFile({
  generatedEntitlementsPath,
  plistData,
  archivePath,
  manifest,
}) {
  const decodedProvisioningProfileEntitlements = plistData.Entitlements;

  const entitlementsPattern = path.join(
    archivePath,
    'Products/Applications/ExpoKitApp.app/*.entitlements'
  );
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
    if (rule in archiveEntitlementsData) {
      entitlements[rule] = archiveEntitlementsData[rule];
    }
  });

  let generatedEntitlements = _.omit(entitlements, blacklistedEntitlementKeys);

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
  if (generatedEntitlements[icloudContainerEnvKey]) {
    const envs = generatedEntitlements[icloudContainerEnvKey].filter(i => i === 'Production');
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

async function resignIPA(
  {
    codeSignIdentity,
    entitlementsPath,
    provisioningProfilePath,
    sourceIpaPath,
    destIpaPath,
    keychainPath,
  },
  credentials
) {
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

async function runFastlane({ teamID }, fastlaneArgs, loggerFields) {
  const fastlaneEnvVars = {
    FASTLANE_SKIP_UPDATE_CHECK: 1,
    FASTLANE_DISABLE_COLORS: 1,
    FASTLANE_TEAM_ID: teamID,
    CI: 1,
    LC_ALL: 'en_US.UTF-8',
  };

  await spawnAsyncThrowError('fastlane', fastlaneArgs, {
    env: { ...process.env, ...fastlaneEnvVars },
    pipeToLogger: true,
    dontShowStdout: false,
    loggerFields,
  });
}

export {
  ensureCertificateValid,
  findP12CertSerialNumber,
  validateProvisioningProfile,
  writeExportOptionsPlistFile,
  buildIPA,
  resolveExportMethod,
  createEntitlementsFile,
  resignIPA,
};
