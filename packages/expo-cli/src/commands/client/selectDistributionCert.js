import { Credentials } from 'xdl';

import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import log from '../../log';
import prompt from '../../prompt';

export default async function selectDistributionCert(context, options = {}) {
  let certificates = context.username
    ? await Credentials.Ios.getExistingDistCerts(context.username, context.team.id)
    : [];
  let choices = [{ name: '[Upload an existing certificate]', value: 'UPLOAD' }, ...certificates];
  if (!options.disableCreate) {
    choices.unshift({ name: '[Create a new certificate]', value: 'GENERATE' });
  }
  let { distributionCert } = await prompt({
    type: 'list',
    name: 'distributionCert',
    message: 'Select an iOS distribution certificate to use for code signing:',
    pageSize: Infinity,
    choices,
  });
  if (distributionCert === 'GENERATE') {
    distributionCert = await generateDistributionCert(context);
  } else if (distributionCert === 'UPLOAD') {
    distributionCert = (await promptForCredentials(context, ['distributionCert']))[0]
      .distributionCert;
  }
  return distributionCert;
}

async function generateDistributionCert(context) {
  let manager = appleApi.createManagers(context).distributionCert;
  try {
    return await manager.create({});
  } catch (e) {
    if (e.code === 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR') {
      let certificates = await manager.list();
      log.warn(`Maximum number (${certificates.length}) of certificates generated.`);
      let { answer } = await prompt({
        type: 'list',
        name: 'answer',
        message: 'Please revoke or reuse an existing certificate:',
        choices: [
          {
            key: 'r',
            name: 'Choose certificates to revoke and try again',
            value: 'REVOKE',
          },
          {
            key: 'e',
            name: 'Use an existing certificate',
            value: 'USE_EXISTING',
          },
        ],
      });
      if (answer === 'REVOKE') {
        await credentials.revoke(context, ['distributionCert']);
        return await generateDistributionCert(context);
      } else if (answer === 'USE_EXISTING') {
        return await selectDistributionCert(context, { disableCreate: true });
      }
    }
  }
}
