import { IOSConfig } from '@expo/config-plugins';
import chalk from 'chalk';
import program from 'commander';
import * as fs from 'fs-extra';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { selectAsync } from '../../../prompts';
import { learnMore } from '../../utils/TerminalLink';
import * as Security from '../utils/Security';

/**
 * Find the development team and provisioning profile that's currently in use by the Xcode project.
 *
 * @param projectRoot
 * @returns
 */
function getCodeSigningInfoForPbxproj(
  projectRoot: string
): { developmentTeam?: string; provisioningProfile?: string } {
  // TODO: Test
  const info = IOSConfig.XcodeUtils.getDevelopmentTeamForProject(projectRoot);
  const developmentTeam = info.find(([developerTeamId]) => developerTeamId) as string | undefined;
  const provisioningProfile = info.find(([, profile]) => profile) as string | undefined;
  return { developmentTeam, provisioningProfile };
}

/**
 * Set the development team and configure the Xcode project for automatic code signing,
 * this helps us resolve the code signing on subsequent runs and emulates Xcode behavior.
 *
 * @param projectRoot
 * @param props.appleTeamId
 */
function setAutoCodeSigningInfoForPbxproj(
  projectRoot: string,
  { appleTeamId }: { appleTeamId: string }
): void {
  const project = IOSConfig.XcodeUtils.getPbxproj(projectRoot);
  const [nativeTargetId, nativeTarget] = IOSConfig.XcodeUtils.findFirstNativeTarget(project);

  IOSConfig.XcodeUtils.getBuildConfigurationForId(project, nativeTarget.buildConfigurationList)
    .filter(
      ([, item]: IOSConfig.XcodeUtils.ConfigurationSectionEntry) => item.buildSettings.PRODUCT_NAME
    )
    .forEach(([, item]: IOSConfig.XcodeUtils.ConfigurationSectionEntry) => {
      item.buildSettings.DEVELOPMENT_TEAM = appleTeamId;
      item.buildSettings.CODE_SIGN_IDENTITY = '"Apple Development"';
      item.buildSettings.CODE_SIGN_STYLE = 'Automatic';
    });

  Object.entries(IOSConfig.XcodeUtils.getProjectSection(project))
    .filter(IOSConfig.XcodeUtils.isNotComment)
    .forEach(([, item]: IOSConfig.XcodeUtils.ProjectSectionEntry) => {
      item.attributes.TargetAttributes[nativeTargetId].DevelopmentTeam = appleTeamId;
      item.attributes.TargetAttributes[nativeTargetId].ProvisioningStyle = 'Automatic';
    });

  fs.writeFileSync(project.filepath, project.writeSync());
}

export async function ensureDeviceIsCodeSignedForDeploymentAsync(
  projectRoot: string
): Promise<string | null> {
  // Check if the app already has a development team defined.
  const { developmentTeam, provisioningProfile } = getCodeSigningInfoForPbxproj(projectRoot);
  if (developmentTeam) {
    Log.log(chalk.dim`\u203A Auto signing app using team: ${developmentTeam}`);
    return null;
  }

  if (provisioningProfile) {
    // it works but it's unclear why...
    return null;
  }

  // Only assert if the project needs to be signed.
  await Security.assertInstalledAsync();

  const ids = await Security.findIdentitiesAsync();

  const id = await selectCertificateSigningIdentityAsync(ids);

  Log.log(`\u203A Signing and building iOS app with: ${id.codeSigningInfo}`);

  setAutoCodeSigningInfoForPbxproj(projectRoot, {
    appleTeamId: id.appleTeamId!,
  });
  return id.appleTeamId!;
}

async function selectCertificateSigningIdentityAsync(ids: string[]) {
  // The user has no valid code signing identities.
  if (!ids.length) {
    // TODO: We can probably do this too.
    Log.addNewLineIfNone();
    Log.log(
      `\u203A Your computer requires some additional setup before you can build onto physical iOS devices. ${learnMore(
        'https://expo.fyi/setup-dev-code-signing-certificates'
      )}`
    );
    Log.newLine();
    throw new CommandError('No code signing certificates are available to use.');
  }

  //  One ID available 🤝 Program is not interactive
  //
  //     using the the first available option
  if (ids.length === 1 || program.nonInteractive) {
    return Security.resolveCertificateSigningInfoAsync(ids[0]);
  }

  const identities = await Security.resolveIdentitiesAsync(ids);

  const index = await selectAsync({
    message: 'Development team for signing the app',
    choices: identities.map((value, i) => ({
      // Formatted like: `650 Industries, Inc. (A1BCDEF234) - Apple Development: Evan Bacon (AA00AABB0A)`
      title: [value.appleTeamName, `(${value.appleTeamId}) -`, value.codeSigningInfo].join(' '),
      value: i,
    })),
  });
  // TODO: Maybe cache and reuse selected option across new apps?
  return identities[index];
}
