import { CredentialsSource } from '../../easJson';
import log from '../../log';
import { AppLookupParams } from '../api/IosApi';
import { Context } from '../context';
import * as credentialsJsonReader from '../credentialsJson/read';
import { runCredentialsManager } from '../route';
import { SetupIosBuildCredentials } from '../views/SetupIosBuildCredentials';
import { CredentialsProvider } from './provider';

export interface iOSCredentials {
  provisioningProfile: string;
  distributionCertificate: {
    certP12: string;
    certPassword: string;
  };
}

interface PartialiOSCredentials {
  provisioningProfile?: string;
  distributionCertificate?: {
    certP12?: string;
    certPassword?: string;
  };
}

interface Options {
  nonInteractive: boolean;
  skipCredentialsCheck: boolean;
}

export default class iOSCredentialsProvider implements CredentialsProvider {
  public readonly platform = 'ios';
  private readonly ctx = new Context();
  private credentials?: iOSCredentials;

  constructor(private projectDir: string, private app: AppLookupParams, private options: Options) {}

  public async initAsync() {
    await this.ctx.init(this.projectDir, {
      nonInteractive: this.options.nonInteractive,
    });
  }

  public async hasRemoteAsync(): Promise<boolean> {
    const distCert = await this.ctx.ios.getDistCert(this.app);
    const provisioningProfile = await this.ctx.ios.getProvisioningProfile(this.app);
    return !!(distCert || provisioningProfile);
  }

  public async hasLocalAsync(): Promise<boolean> {
    if (!(await credentialsJsonReader.fileExistsAsync(this.projectDir))) {
      return false;
    }
    try {
      const rawCredentialsJson = await credentialsJsonReader.readRawAsync(this.projectDir);
      return !!rawCredentialsJson?.ios;
    } catch (err) {
      log.error(err); // malformed json
      return false;
    }
  }

  public async isLocalSyncedAsync(): Promise<boolean> {
    try {
      const [remote, local] = await Promise.all([this.fetchRemoteAsync(), this.getLocalAsync()]);
      const r = remote;
      const l = local as iOSCredentials; // ts definion can't resolve return type correctly
      return !!(
        r.provisioningProfile === l.provisioningProfile &&
        r.distributionCertificate?.certP12 === l.distributionCertificate.certP12 &&
        r.distributionCertificate?.certPassword === l.distributionCertificate.certPassword
      );
    } catch (_) {
      return false;
    }
  }

  public async getCredentialsAsync(
    src: CredentialsSource.LOCAL | CredentialsSource.REMOTE
  ): Promise<iOSCredentials> {
    switch (src) {
      case CredentialsSource.LOCAL:
        return await this.getLocalAsync();
      case CredentialsSource.REMOTE:
        return await this.getRemoteAsync();
    }
  }

  private async getLocalAsync(): Promise<iOSCredentials> {
    return await credentialsJsonReader.readIosCredentialsAsync(this.projectDir);
  }
  private async getRemoteAsync(): Promise<iOSCredentials> {
    if (this.options.skipCredentialsCheck) {
      log('Skipping credentials check');
    } else {
      await runCredentialsManager(this.ctx, new SetupIosBuildCredentials(this.app));
    }
    const distCert = await this.ctx.ios.getDistCert(this.app);
    if (!distCert?.certP12 || !distCert?.certPassword) {
      if (this.options.skipCredentialsCheck) {
        throw new Error(
          'Distribution certificate is missing and credentials check was skipped. Run without --skip-credentials-check to set it up.'
        );
      } else {
        throw new Error('Distribution certificate is missing');
      }
    }
    const provisioningProfile = await this.ctx.ios.getProvisioningProfile(this.app);
    if (!provisioningProfile?.provisioningProfile) {
      if (this.options.skipCredentialsCheck) {
        throw new Error(
          'Provisioning profile is missing and credentials check was skipped. Run without --skip-credentials-check to set it up.'
        );
      } else {
        throw new Error('Provisioning profile is missing');
      }
    }
    return {
      provisioningProfile: provisioningProfile.provisioningProfile,
      distributionCertificate: {
        certP12: distCert.certP12,
        certPassword: distCert.certPassword,
      },
    };
  }

  private async fetchRemoteAsync(): Promise<PartialiOSCredentials> {
    const distCert = await this.ctx.ios.getDistCert(this.app);
    const provisioningProfile = await this.ctx.ios.getProvisioningProfile(this.app);
    return {
      provisioningProfile: provisioningProfile?.provisioningProfile,
      distributionCertificate: {
        certP12: distCert?.certP12,
        certPassword: distCert?.certPassword,
      },
    };
  }
}
