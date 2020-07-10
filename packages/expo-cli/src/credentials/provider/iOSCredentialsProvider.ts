import { SetupIosBuildCredentials } from '../views/SetupIosBuildCredentials';
import { runCredentialsManager } from '../route';
import { Context } from '../context';
import { credentialsJson } from '../local';
import { CredentialsProvider } from './provider';
import { CredentialsSource } from '../../easJson';

export interface iOSCredentials {
  provisioningProfile: string;
  distributionCertificate: {
    certP12: string;
    certPassword: string;
  };
}

interface Options {
  projectName: string;
  accountName: string;
  bundleIdentifier: string;
}

export default class iOSCredentialsProvider implements CredentialsProvider {
  public readonly platform = 'ios';
  private readonly ctx = new Context();
  private credentials?: iOSCredentials;

  constructor(private projectDir: string, private options: Options) {}

  get projectFullName(): string {
    const { projectName, accountName } = this.options;
    return `@${accountName}/${projectName}`;
  }

  public async initAsync() {
    await this.ctx.init(this.projectDir);
  }

  public async hasRemoteAsync(): Promise<boolean> {
    const distCert = await this.ctx.ios.getDistCert(
      this.projectFullName,
      this.options.bundleIdentifier
    );
    const provisioningProfile = await this.ctx.ios.getProvisioningProfile(
      this.projectFullName,
      this.options.bundleIdentifier
    );
    return !!(distCert && provisioningProfile);
  }

  public async hasLocalAsync(): Promise<boolean> {
    if (!(await credentialsJson.fileExistsAsync(this.projectDir))) {
      return false;
    }
    try {
      await credentialsJson.readIosAsync(this.projectDir);
      return true;
    } catch (_) {
      return false;
    }
  }

  public async isLocalSyncedAsync(): Promise<boolean> {
    const [remote, local] = await Promise.allSettled([this.getRemoteAsync(), this.getLocalAsync()]);
    if (remote.status === 'fulfilled' && local.status === 'fulfilled') {
      const r = remote.value;
      const l = local.value;
      return !!(
        r.provisioningProfile === l.provisioningProfile &&
        r.distributionCertificate.certP12 === l.distributionCertificate.certP12 &&
        r.distributionCertificate.certPassword === l.distributionCertificate.certPassword
      );
    }
    return true;
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
    return await credentialsJson.readIosAsync(this.projectDir);
  }
  private async getRemoteAsync(): Promise<iOSCredentials> {
    await runCredentialsManager(
      this.ctx,
      new SetupIosBuildCredentials({
        experienceName: this.projectFullName,
        bundleIdentifier: this.options.bundleIdentifier,
      })
    );
    const distCert = await this.ctx.ios.getDistCert(
      this.projectFullName,
      this.options.bundleIdentifier
    );
    if (!distCert) {
      throw new Error('Missing distribution certificate'); // shouldn't happen
    }
    const provisioningProfile = await this.ctx.ios.getProvisioningProfile(
      this.projectFullName,
      this.options.bundleIdentifier
    );
    if (!provisioningProfile) {
      throw new Error('Missing provisioning profile'); // shouldn't happen
    }
    return {
      provisioningProfile: provisioningProfile.provisioningProfile,
      distributionCertificate: {
        certP12: distCert.certP12,
        certPassword: distCert.certPassword,
      },
    };
  }
}
