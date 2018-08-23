import _ from 'lodash';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import plist from 'plist';

import _logger from './Logger';
import { spawnAsyncThrowError } from './ExponentTools';
import * as IosCodeSigning from './IosCodeSigning';

const logger = _logger.withFields({ buildPhase: 'building and signing IPA' });

export default function createIPABuilder(buildParams) {
  const {
    appUUID,
    keychainPath,
    bundleIdentifier,
    teamID,
    workingDir = process.env.TURTLE_WORKING_DIR_PATH,
    manifest,
  } = buildParams;
  const workspace = path.join(
    workingDir,
    'shellAppWorkspaces',
    'ios',
    'default',
    'ExpoKitApp.xcworkspace'
  );
  const appDir = path.join('/private/tmp/turtle', appUUID);
  const buildDir = path.join(appDir, 'build');
  const provisionDir = path.join(appDir, 'provisioning');
  const outputPath = path.join(appDir, 'archive.xcarchive');
  const uploadPath = path.join(buildDir, 'archive.ipa');

  async function build() {
    const { provisioningProfilePath, clientBuild } = buildParams;

    await copyProvisioningProfileToHomedir(provisioningProfilePath, appUUID);
    logger.info('provisioning profile copied to home directory');
    const plistData = await readCMSMessage(provisioningProfilePath);
    logger.info('done retrieving provisioning profile data');

    logger.info('checking if teamID is present in keychain and that certificate is valid...');
    const codeSignIdentity = await IosCodeSigning.ensureCertificateValid(buildParams);
    logger.info('ensured certificate is valid');

    logger.info('validating provisioning profile...');
    IosCodeSigning.validateProvisioningProfile(plistData, {
      distCertFingerprint: codeSignIdentity,
      teamID,
      bundleIdentifier,
    });
    logger.info('provisioning profile is valid');

    logger.info('writing export-options.plist file...');
    const exportMethod = IosCodeSigning.resolveExportMethod(plistData);
    const exportOptionsPlistPath = path.join(provisionDir, 'export-options.plist');
    const exportOptionsData = {
      bundleIdentifier,
      provisioningProfileUUID: plistData.UUID,
      exportMethod,
      teamID,
    };
    await IosCodeSigning.writeExportOptionsPlistFile(exportOptionsPlistPath, exportOptionsData);
    logger.info('created export-options.plist file');

    logger.info('generating IPA...');
    const unsignedIpaPath = path.join(buildDir, `${appUUID}-unsigned.ipa`);
    const ipaBuilderArgs = {
      ipaPath: unsignedIpaPath,
      workspace,
      archivePath: outputPath,
      codeSignIdentity,
      exportOptionsPlistPath,
      plistData,
      keychainPath,
      exportMethod,
    };
    await IosCodeSigning.buildIPA(ipaBuilderArgs, buildParams, clientBuild);
    logger.info('generated IPA');

    logger.info('creating entitlements file...');
    const generatedEntitlementsPath = path.join(appDir, 'generatedEntitlements.entitlements');
    await IosCodeSigning.createEntitlementsFile({
      generatedEntitlementsPath,
      plistData,
      archivePath: outputPath,
      manifest,
    });
    logger.info('created entitlements file');

    logger.info('resigning IPA...');
    await IosCodeSigning.resignIPA(
      {
        codeSignIdentity,
        entitlementsPath: generatedEntitlementsPath,
        provisioningProfilePath,
        sourceIpaPath: unsignedIpaPath,
        destIpaPath: uploadPath,
        keychainPath,
      },
      buildParams
    );
    logger.info('resigned IPA');
  }

  async function cleanup() {
    try {
      await fs.remove(getProvisioningProfilePath(appUUID));
    } catch (err) {
      logger.error('failed to perform cleanup, error:', err);
    }
  }

  async function copyProvisioningProfileToHomedir(provisioningProfilePath, appUUID) {
    await fs.mkdirp(getProvisioningProfileDirPath());
    const newProvisioningProfilePath = getProvisioningProfilePath(appUUID);
    await fs.copy(provisioningProfilePath, newProvisioningProfilePath);
  }

  async function readCMSMessage(provisioningProfilePath) {
    const { output } = await spawnAsyncThrowError(
      'security',
      ['cms', '-D', '-i', provisioningProfilePath],
      {
        stdio: 'pipe',
      }
    );
    const plistRaw = output.join('');
    const plistData = _.attempt(plist.parse, plistRaw);
    if (_.isError(plistData)) {
      throw new Error(`Error when parsing plist: ${plistData.message}`);
    }
    return plistData;
  }

  const getProvisioningProfileDirPath = () =>
    path.join(os.homedir(), 'Library/MobileDevice/Provisioning Profiles');

  const getProvisioningProfilePath = appUUID =>
    path.join(getProvisioningProfileDirPath(), `${appUUID}.mobileprovision`);

  return { build, cleanup };
}
