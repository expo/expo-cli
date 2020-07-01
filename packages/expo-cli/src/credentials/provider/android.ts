import { SetupAndroidKeystore } from '../views/SetupAndroidKeystore';
import { Keystore } from '../credentials';
import { runCredentialsManager } from '../route';
import { Context } from '../context';
import { credentialsJson } from '../local';
import { CredentialsProvider } from './provider';
import log from '../../log';

export interface AndroidCredentials {
  keystore: Keystore;
}

interface Options {
  projectName: string;
  accountName: string;
}

export class AndroidCredentialsProvider implements CredentialsProvider {
  public readonly platform = 'android';
  private readonly ctx = new Context();
  private credentials?: AndroidCredentials;

  constructor(private projectDir: string, private options: Options) {}

  get projectFullName(): string {
    const { projectName, accountName } = this.options;
    return `@${accountName}/${projectName}`;
  }

  public async initAsync() {
    await this.ctx.init(this.projectDir);
  }

  public async hasRemoteAsync(): Promise<boolean> {
    const keystore = await this.ctx.android.fetchKeystore(this.projectFullName);
    return this.isValidKeystore(keystore);
  }

  public async hasLocalAsync(): Promise<boolean> {
    if (!(await credentialsJson.fileExistsAsync(this.projectDir))) {
      return false;
    }
    try {
      const credentials = await credentialsJson.readAndroidAsync(this.projectDir);
      return this.isValidKeystore(credentials.keystore);
    } catch (err) {
      return false;
    }
  }

  public async useRemoteAsync(): Promise<void> {
    await runCredentialsManager(
      this.ctx,
      new SetupAndroidKeystore(this.projectFullName, {
        allowMissingKeystore: false,
      })
    );
    const keystore = await this.ctx.android.fetchKeystore(this.projectFullName);
    if (!keystore || !this.isValidKeystore(keystore)) {
      throw new Error('Unable to set up credentials');
    }
    this.credentials = { keystore };
  }

  public async useLocalAsync(): Promise<void> {
    const credentials = await credentialsJson.readAndroidAsync(this.projectDir);
    if (!this.isValidKeystore(credentials.keystore)) {
      throw new Error('Invalid keystore in credentials.json');
    }
    this.credentials = credentials;
  }

  public async isLocalSyncedAsync(): Promise<boolean> {
    const [remote, local] = await Promise.allSettled([
      this.ctx.android.fetchKeystore(this.projectFullName),
      await credentialsJson.readAndroidAsync(this.projectDir),
    ]);
    if (remote.status === 'fulfilled' && local.status === 'fulfilled') {
      const r = remote.value!;
      const l = local.value.keystore!;
      return !!(
        r.keystore === l.keystore &&
        r.keystorePassword === l.keystorePassword &&
        r.keyAlias === l.keyAlias &&
        r.keyPassword === l.keyPassword &&
        this.isValidKeystore(r)
      );
    }
    return true;
  }

  public async getCredentialsAsync(): Promise<AndroidCredentials> {
    if (!this.credentials) {
      throw new Error('credentials not specified'); // shouldn't happen
    }
    return this.credentials;
  }

  private isValidKeystore(keystore?: Keystore | null) {
    return !!(
      keystore &&
      keystore.keystore &&
      keystore.keystorePassword &&
      keystore.keyPassword &&
      keystore.keyAlias
    );
  }
}
