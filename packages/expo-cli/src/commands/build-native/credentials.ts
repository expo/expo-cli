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

async function ensureCredentialsAutoAsync(
  provider: CredentialsProvider,
  workflow: Workflow
): Promise<CredentialsSource.LOCAL | CredentialsSource.REMOTE> {
  const platform = platformMapName[provider.platform];
  switch (workflow) {
    case Workflow.Managed:
      if (await provider.hasLocalAsync()) {
        return CredentialsSource.LOCAL;
      } else {
        return CredentialsSource.REMOTE;
      }
    case Workflow.Generic: {
      const hasLocal = await provider.hasLocalAsync();
      const hasRemote = await provider.hasRemoteAsync();
      if (hasRemote && hasLocal) {
        if (!(await provider.isLocalSyncedAsync())) {
          log(
            `Contents of your local credentials.json for ${platform} are not the same as credentials on Expo servers`
          );
          const { select } = await prompts({
            type: 'select',
            name: 'select',
            message: 'Which credentials you want to use for this build?',
            choices: [
              { title: 'Local credentials.json', value: CredentialsSource.LOCAL },
              { title: 'Credentials stored on Expo servers.', value: CredentialsSource.REMOTE },
            ],
          });
          return select;
        } else {
          return CredentialsSource.LOCAL;
        }
      } else if (hasLocal) {
        return CredentialsSource.LOCAL;
      } else if (hasRemote) {
        return CredentialsSource.REMOTE;
      } else {
        log.warn(
          `Credentials for this app are not configured and there is no entry in credentials.json for ${platform}`
        );
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Do you want to generete new credentials?',
        });
        if (confirm) {
          return CredentialsSource.REMOTE;
        } else {
          throw new Error(`Aborting build process, credentials are not configured for ${platform}`);
        }
      }
    }
  }
}

export async function ensureCredentialsAsync(
  provider: CredentialsProvider,
  workflow: Workflow,
  src: CredentialsSource
): Promise<CredentialsSource.LOCAL | CredentialsSource.REMOTE> {
  switch (src) {
    case CredentialsSource.LOCAL:
      return CredentialsSource.LOCAL;
    case CredentialsSource.REMOTE:
      return CredentialsSource.REMOTE;
    case CredentialsSource.AUTO:
      return await ensureCredentialsAutoAsync(provider, workflow);
  }
}
