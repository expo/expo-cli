import { IOSConfig } from '@expo/config-plugins';
import spawnAsync from '@expo/spawn-async';
import assert from 'assert';
import chalk from 'chalk';
import program from 'commander';
import forge from 'node-forge';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { selectAsync } from '../../../prompts';
import { learnMore } from '../../utils/TerminalLink';

type CertificateSigningInfo = {
  signingCertificateId: string;
  /**
   * Apple Development: Evan Bacon (AA00AABB0A)
   */
  codeSigningInfo?: string;
  /**
   * "650 Industries, Inc."
   */
  appleTeamName?: string;
  /**
   * C8D8QTF339
   */
  appleTeamId?: string;
};

function getCurrentDevelopmentTeam(projectRoot: string) {
  const info = IOSConfig.XcodeUtils.getDevelopmentTeamForProject(projectRoot);
  const developmentTeam = info.find(([developerTeamId]) => developerTeamId);
  const provisioningProfile = info.find(([, profile]) => profile);
  return [developmentTeam, provisioningProfile];
}

export async function getDevelopmentTeamAsync(projectRoot: string): Promise<string | null> {
  // Check if the app already has a development team defined.
  const [developmentTeam, provisioningProfile] = getCurrentDevelopmentTeam(projectRoot);
  if (developmentTeam) {
    Log.log(chalk.dim`\u203A Auto signing app using team: ${developmentTeam}`);
    return null;
  }

  if (provisioningProfile) {
    // it works but it's unclear why...
    return null;
  }

  // Only assert if the project needs to be signed.
  await assertSecurityInstalledAsync();

  const ids = await findIdentitiesAsync();

  const id = await selectCertificateSigningIdentityAsync(ids);

  Log.log(`\u203A Signing and building iOS app with: ${id.codeSigningInfo}`);

  IOSConfig.ProvisioningProfile.configureAutoCodeSigningForPbxproj(projectRoot, {
    appleTeamId: id.appleTeamId!,
  });
  return id.appleTeamId!;
}

async function resolveIdentitiesAsync(identities: string[]): Promise<CertificateSigningInfo[]> {
  const values = identities.map(extractSigningId).filter(Boolean) as string[];
  return await Promise.all(
    values.map(signingCertificateId => resolveCertificateSigningInfoAsync(signingCertificateId))
  );
}

async function resolveCertificateSigningInfoAsync(
  signingCertificateId: string
): Promise<CertificateSigningInfo> {
  const certificate = await getCertificateForSigningIdAsync(signingCertificateId);
  return {
    signingCertificateId,
    codeSigningInfo: certificate.subject.getField('CN')?.value,
    appleTeamName: certificate.subject.getField('O')?.value,
    appleTeamId: certificate.subject.getField('OU')?.value,
  };
}

async function getCertificateForSigningIdAsync(id: string): Promise<forge.pki.Certificate> {
  const pem = (await spawnAsync('security', ['find-certificate', '-c', id, '-p'])).stdout?.trim?.();
  assert(pem, `Failed to get PEM certificate for ID "${id}" using the \`security\` CLI`);
  return forge.pki.certificateFromPem(pem);
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
  //    using the the available first option.
  //
  if (ids.length === 1 || program.nonInteractive) {
    return resolveCertificateSigningInfoAsync(ids[0]);
  }

  const identities = await resolveIdentitiesAsync(ids);

  const index = await selectAsync({
    message: 'Development team for signing the app',
    choices: identities.map((value, i) => ({
      // Formatted like: `650 Industries, Inc. (C8D8QTF339) - Apple Development: Evan Bacon (PH75MDXG4H)`
      title: [value.appleTeamName, `(${value.appleTeamId}) -`, value.codeSigningInfo].join(' '),
      value: i,
    })),
  });
  // TODO: Maybe cache and reuse selected option across new apps.
  return identities[index];
}

async function assertSecurityInstalledAsync() {
  try {
    await spawnAsync('which', ['security']);
  } catch {
    throw new CommandError('Cannot code sign project because the CLI `security` is not available');
  }
}

async function findIdentitiesAsync(): Promise<string[]> {
  const results = (
    await spawnAsync('security', ['find-identity', '-p', 'codesigning', '-v'])
  ).stdout.trim?.();
  // 1) 12222234253761286351826735HGKDHAJGF45283 "Apple Development: Evan Bacon (AA00AABB0A)" (CSSMERR_TP_CERT_REVOKED)
  // 2) 12312234253761286351826735HGKDHAJGF45283 "Apple Development: bacon@expo.io (BB00AABB0A)"
  // 3) 12442234253761286351826735HGKDHAJGF45283 "iPhone Distribution: Evan Bacon (CC00AABB0B)" (CSSMERR_TP_CERT_REVOKED)
  // 4) 15672234253761286351826735HGKDHAJGF45283 "Apple Development: Evan Bacon (AA00AABB0A)"
  //  4 valid identities found

  const parsed = results
    .split('\n')
    .map(line => extractCodeSigningInfo(line))
    .filter(Boolean) as string[];

  // Remove duplicates
  return [...new Set(parsed)];
}

/**
 * @param value '  2) 12312234253761286351826735HGKDHAJGF45283 "Apple Development: bacon@expo.io (BB00AABB0A)"'
 * @returns 'Apple Development: Evan Bacon (PH75MDXG4H)'
 */
export function extractCodeSigningInfo(value: string): string | null {
  return value.match(/^\s*\d+\).+"(.+Develop(ment|er).+)"$/)?.[1] ?? null;
}

/**
 * @param codeSigningInfo 'Apple Development: Evan Bacon (AA00AABB0A)'
 * @returns 'AA00AABB0A'
 */
export function extractSigningId(codeSigningInfo: string): string | null {
  return codeSigningInfo.match(/.*\(([a-zA-Z0-9]+)\)/)?.[1] ?? null;
}
