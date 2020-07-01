import { Keystore } from '../../credentials/credentials';
import { CredentialsProvider } from '../../credentials/provider';
import { BuilderContext } from './build';
import { CredentialsSource, Workflow } from '../../easJson';
import prompts from '../../prompts';
import log from '../../log';

const platformMapName = {
  ios: 'iOS',
  android: 'Android',
};

export async function ensureCredentialsAsync(
  provider: CredentialsProvider,
  workflow: Workflow,
  src: CredentialsSource
): Promise<void> {
  const platform = platformMapName[provider.platform];
  if (src === CredentialsSource.LOCAL) {
    await provider.useLocalAsync();
  } else if (src === CredentialsSource.REMOTE) {
    await provider.useRemoteAsync();
  } else if (workflow === Workflow.Managed) {
    if (await provider.hasLocalAsync()) {
      await provider.useLocalAsync();
    } else {
      await provider.useRemoteAsync();
    }
  } else if (workflow === Workflow.Generic) {
    const hasLocal = await provider.hasLocalAsync();
    const hasRemote = await provider.hasRemoteAsync();
    if (hasRemote && hasLocal) {
      if (!(await provider.isLocalSyncedAsync())) {
        log(
          `Content of your local credentials.json for ${platform} is not the same as credentials on Expo servers`
        );
        const { select } = await prompts({
          type: 'select',
          name: 'select',
          message: 'Which credentials you want to use for this build?',
          choices: [
            { title: 'Local credentials.json', value: 'local' },
            { title: 'Credentials stored on Expo servers.', value: 'remote' },
          ],
        });
        if (select === 'local') {
          await provider.useLocalAsync();
        } else {
          await provider.useRemoteAsync();
        }
      } else {
        await provider.useLocalAsync();
      }
    } else if (hasLocal) {
      await provider.useLocalAsync();
    } else if (hasRemote) {
      await provider.useRemoteAsync();
    } else {
      log.warn(
        `Credentials for this app  are not configured and there is no entry in credentials.json for ${platform}`
      );
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Do you want to generete new credentials?',
      });
      if (confirm) {
        await provider.useRemoteAsync();
      } else {
        throw new Error(`Aborting build process, credentials are not configured for ${platform}`);
      }
    }
  }
}
