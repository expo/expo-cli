import { IOSConfig } from '@expo/config-plugins';
import chalk from 'chalk';
import program from 'commander';
import * as fs from 'fs-extra';
import { UserSettings } from 'xdl';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { selectAsync } from '../../../prompts';
import { learnMore } from '../../utils/TerminalLink';
import * as Security from '../utils/Security';

async function getLastDeveloperCodeSigningIdAsync() {
  const { developmentCodeSigningId } = await UserSettings.readAsync();
  return developmentCodeSigningId;
}

async function setLastDeveloperCodeSigningIdAsync(id: string) {
  await UserSettings.setAsync('developmentCodeSigningId', id).catch(() => {});
}

/**
 * Find the development team and provisioning profile that's currently in use by the Xcode project.
 *
 * @param projectRoot
 * @returns
 */
export function getCodeSigningInfoForPbxproj(projectRoot: string) {
  const project = IOSConfig.XcodeUtils.getPbxproj(projectRoot);
  const [, nativeTarget] = IOSConfig.Target.findFirstNativeTarget(project);

  const developmentTeams: string[] = [];
  const provisioningProfiles: string[] = [];

  IOSConfig.XcodeUtils.getBuildConfigurationsForListId(project, nativeTarget.buildConfigurationList)
    .filter(
      ([, item]: IOSConfig.XcodeUtils.ConfigurationSectionEntry) => item.buildSettings.PRODUCT_NAME
    )
    .forEach(([, item]: IOSConfig.XcodeUtils.ConfigurationSectionEntry) => {
      const { DEVELOPMENT_TEAM, PROVISIONING_PROFILE } = item.buildSettings;
      if (
        typeof DEVELOPMENT_TEAM === 'string' &&
        // If the user selects "Team: none" in Xcode, it'll be an empty string.
        !!DEVELOPMENT_TEAM &&
        // xcode package sometimes reads an empty string as a quoted empty string.
        DEVELOPMENT_TEAM !== '""'
      ) {
        developmentTeams.push(DEVELOPMENT_TEAM);
      }
      if (typeof PROVISIONING_PROFILE === 'string' && !!PROVISIONING_PROFILE) {
        provisioningProfiles.push(PROVISIONING_PROFILE);
      }
    });

  return { developmentTeams, provisioningProfiles };
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
  const [nativeTargetId, nativeTarget] = IOSConfig.Target.findFirstNativeTarget(project);

  IOSConfig.XcodeUtils.getBuildConfigurationsForListId(project, nativeTarget.buildConfigurationList)
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
  const { developmentTeams, provisioningProfiles } = getCodeSigningInfoForPbxproj(projectRoot);
  if (developmentTeams.length) {
    Log.log(chalk.dim`\u203A Auto signing app using team: ${developmentTeams[0]}`);
    return null;
  }

  if (provisioningProfiles.length) {
    // this indicates that the user has manual code signing setup (possibly for production).
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

/**
 * Sort the code signing items so the last selected item (user's default) is the first suggested.
 */
async function sortDefaultIdToBeginningAsync(
  identities: Security.CertificateSigningInfo[]
): Promise<[Security.CertificateSigningInfo[], string | undefined]> {
  const lastSelected = await getLastDeveloperCodeSigningIdAsync();

  if (lastSelected) {
    let iterations = 0;
    while (identities[0].signingCertificateId !== lastSelected && iterations < identities.length) {
      identities.push(identities.shift()!);
      iterations++;
    }
  }
  return [identities, lastSelected];
}

async function selectCertificateSigningIdentityAsync(ids: string[]) {
  // The user has no valid code signing identities.
  if (!ids.length) {
    // TODO: We can probably do this too.
    Log.addNewLineIfNone();
    Log.log(
      `\u203A Your computer requires some additional setup before you can build onto physical iOS devices.\n  ${chalk.bold(
        learnMore('https://expo.fyi/setup-xcode-signing')
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

  // Get identities and sort by the one that the user is most likely to choose.
  const [identities, preferred] = await sortDefaultIdToBeginningAsync(
    await Security.resolveIdentitiesAsync(ids)
  );

  const index = await selectAsync({
    message: 'Development team for signing the app',
    choices: identities.map((value, i) => {
      const format =
        value.signingCertificateId === preferred ? chalk.bold : (message: string) => message;
      return {
        // Formatted like: `650 Industries, Inc. (A1BCDEF234) - Apple Development: Evan Bacon (AA00AABB0A)`
        title: format(
          [value.appleTeamName, `(${value.appleTeamId}) -`, value.codeSigningInfo].join(' ')
        ),
        value: i,
      };
    }),
  });

  const selected = identities[index];

  // Store the last used value and suggest it as the first value
  // next time the user has to select a code signing identity.
  await setLastDeveloperCodeSigningIdAsync(selected.signingCertificateId);

  return selected;
}
