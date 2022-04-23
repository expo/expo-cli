import {
  Certificate,
  CertificateType,
  createCertificateAndP12Async,
  RequestContext,
} from '@expo/apple-utils';
import chalk from 'chalk';
import dateformat from 'dateformat';

import CommandError, { ErrorCodes } from '../CommandError';
import { ora } from '../utils/ora';
import { AppleCtx, getRequestContext } from './authenticate';

export type DistCertInfo = {
  id: string;
  name: string;
  status: string;
  created: number;
  expires: number;
  ownerName: string;
  ownerId: string;
  serialNumber: string;
};

export type DistCert = {
  certId?: string;
  certP12: string;
  certPassword: string;
  certPrivateSigningKey?: string;
  distCertSerialNumber?: string;
  teamId: string;
  teamName?: string;
};

export class AppleTooManyCertsError extends CommandError {}

export async function getCertificateBySerialNumberAsync(
  context: RequestContext,
  serialNumber: string
): Promise<Certificate> {
  const cert = (await Certificate.getAsync(context)).find(
    item => item.attributes.serialNumber === serialNumber
  );
  if (!cert) {
    throw new CommandError(`No certificate exists with serial number "${serialNumber}"`);
  }
  return cert;
}

export async function getDistributionCertificateAync(
  context: RequestContext,
  serialNumber: string
): Promise<Certificate | null> {
  // At most, this returns 2 values.
  const certificates = await Certificate.getAsync(context, {
    query: {
      filter: {
        certificateType: CertificateType.IOS_DISTRIBUTION,
      },
    },
  });
  return (
    certificates.find(certificate => certificate.attributes.serialNumber === serialNumber) ?? null
  );
}

export function transformCertificate(cert: Certificate): DistCertInfo {
  return {
    id: cert.id,
    name: cert.attributes.name,
    status: cert.attributes.status,
    created: new Date(cert.attributes.requestedDate).getTime() / 1000,
    expires: new Date(cert.attributes.expirationDate).getTime() / 1000,
    ownerName: cert.attributes.ownerName,
    ownerId: cert.attributes.ownerId,
    serialNumber: cert.attributes.serialNumber,
  };
}

export async function listDistributionCertificatesAsync(
  authCtx: AppleCtx
): Promise<DistCertInfo[]> {
  const spinner = ora(`Fetching Apple distribution certificates`).start();
  try {
    const context = getRequestContext(authCtx);
    const certs = (
      await Certificate.getAsync(context, {
        query: {
          filter: {
            certificateType: [
              CertificateType.DISTRIBUTION,
              CertificateType.IOS_DISTRIBUTION,
              CertificateType.MAC_APP_DISTRIBUTION,
            ],
          },
        },
      })
    ).map(transformCertificate);
    spinner.succeed(`Fetched Apple distribution certificates`);
    return certs;
  } catch (error: any) {
    spinner.fail(`Failed to fetch Apple distribution certificates`);
    throw error;
  }
}

/**
 * Run from `eas credentials` -> iOS -> Add new Distribution Certificate
 */
export async function createDistributionCertificateAsync(authCtx: AppleCtx): Promise<DistCert> {
  const spinner = ora(`Creating Apple distribution certificate`).start();
  try {
    const context = getRequestContext(authCtx);
    const results = await createCertificateAndP12Async(context, {
      certificateType: CertificateType.IOS_DISTRIBUTION,
    });
    spinner.succeed(`Created Apple distribution certificate`);
    return {
      certId: results.certificate.id,
      certP12: results.certificateP12,
      certPassword: results.password,
      certPrivateSigningKey: results.privateSigningKey,
      distCertSerialNumber: results.certificate.attributes.serialNumber,
      teamId: authCtx.team.id,
      teamName: authCtx.team.name,
    };
  } catch (error: any) {
    spinner.fail('Failed to create Apple distribution certificate');
    // TODO: Move check into apple-utils
    if (
      /You already have a current .* certificate or a pending certificate request/.test(
        error.message
      )
    ) {
      throw new AppleTooManyCertsError(
        ErrorCodes.APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR,
        APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR
      );
    }
    throw error;
  }
}

export async function revokeDistributionCertificateAsync(
  authCtx: AppleCtx,
  ids: string[]
): Promise<void> {
  const name = `Apple distribution certificate${ids?.length === 1 ? '' : 's'}`;
  const spinner = ora(`Revoking ${name}`).start();
  try {
    const context = getRequestContext(authCtx);
    await Promise.all(ids.map(id => Certificate.deleteAsync(context, { id })));

    spinner.succeed(`Revoked ${name}`);
  } catch (error: any) {
    spinner.fail(`Failed to revoke ${name}`);
    throw error;
  }
}

export function isDistCert(obj: { [key: string]: any }): obj is DistCert {
  return (
    obj.certP12 &&
    typeof obj.certP12 === 'string' &&
    obj.certPassword &&
    typeof obj.certPassword === 'string' &&
    obj.teamId &&
    typeof obj.teamId === 'string'
  );
}

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export class DistCertManager {
  constructor(public ctx: AppleCtx) {}

  async list(): Promise<DistCertInfo[]> {
    return listDistributionCertificatesAsync(this.ctx);
  }
  async create(): Promise<DistCert> {
    return createDistributionCertificateAsync(this.ctx);
  }
  async revoke(ids: string[]) {
    return revokeDistributionCertificateAsync(this.ctx, ids);
  }

  format({ name, id, status, expires, created, ownerName }: DistCertInfo): string {
    const expiresDate = _formatTimestamp(expires);
    const createdDate = _formatTimestamp(created);
    return `${name} (${status}) - ID: ${id} - expires: ${expiresDate} (created: ${createdDate}) - owner: ${ownerName}`;
  }
}

function _formatTimestamp(timestamp: number): string {
  return dateformat(new Date(timestamp * 1000));
}
