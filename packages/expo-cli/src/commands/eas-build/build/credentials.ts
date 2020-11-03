import { Workflow } from '@expo/eas-build-job';

import CommandError from '../../../CommandError';
import { CredentialsProvider } from '../../../credentials/provider';
import { CredentialsSource } from '../../../easJson';
import log from '../../../log';
import prompts from '../../../prompts';
import { platformDisplayNames } from '../constants';

const USING_CREDENTIALS_JSON_MSG = 'Using credentials from the local credentials.json file';
const USING_REMOTE_CREDENTIALS_MSG = 'Using credentials stored on the Expo servers';

async function ensureCredentialsAutoAsync(
  provider: CredentialsProvider,
  workflow: Workflow,
  nonInteractive: boolean
): Promise<CredentialsSource.LOCAL | CredentialsSource.REMOTE> {
  const platform = platformDisplayNames[provider.platform];
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
          if (nonInteractive) {
            throw new CommandError(
              'NON_INTERACTIVE',
              `Contents of your local credentials.json for ${platform} are not the same as credentials on Expo servers. To use the desired credentials, set the "builds.${platform}.{profile}.credentialsSource" field in the credentials.json file to one of the following: "local", "remote".`
            );
          } else {
            log(
              `Contents of your local credentials.json for ${platform} are not the same as credentials on Expo servers`
            );
          }

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
        log(log.chalk.bold(USING_CREDENTIALS_JSON_MSG));
        return CredentialsSource.LOCAL;
      } else if (hasRemote) {
        log(log.chalk.bold(USING_REMOTE_CREDENTIALS_MSG));
        return CredentialsSource.REMOTE;
      } else {
        if (nonInteractive) {
          throw new CommandError(
            'NON_INTERACTIVE',
            `Credentials for this app are not configured and there is no entry in credentials.json for ${platform}. Either configure credentials.json, or launch the build without "--non-interactive" flag to get a prompt to generate credentials automatically.`
          );
        } else {
          log.warn(
            `Credentials for this app are not configured and there is no entry in credentials.json for ${platform}`
          );
        }

        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Do you want to generate new credentials?',
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
  src: CredentialsSource,
  nonInteractive: boolean
): Promise<CredentialsSource.LOCAL | CredentialsSource.REMOTE> {
  switch (src) {
    case CredentialsSource.LOCAL:
      log(log.chalk.bold(USING_CREDENTIALS_JSON_MSG));
      return CredentialsSource.LOCAL;
    case CredentialsSource.REMOTE:
      log(log.chalk.bold(USING_REMOTE_CREDENTIALS_MSG));
      return CredentialsSource.REMOTE;
    case CredentialsSource.AUTO:
      log('Resolving credentials source (auto mode)');
      return await ensureCredentialsAutoAsync(provider, workflow, nonInteractive);
  }
}
