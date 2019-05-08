import ora from 'ora';
import { Credentials } from 'xdl';

import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import log from '../../log';
import prompt from '../../prompt';

// XXX: workaround for https://github.com/babel/babel/issues/6262
export default selectDistributionCert;

async function selectDistributionCert(context, options = {}) {
  const certificates = context.username ? await chooseUnrevokedDistributionCert(context) : [];
  const choices = [...certificates];

  if (certificates.length > 0 && !options.disableAutoSelectExisting) {
    const autoselectedCertificate = certificates[0];
    const { useAutoselected } = await prompt({
      name: 'useAutoselected',
      message: `Let Expo automatically select a distribution certificate?`,
      type: 'confirm',
      default: true,
    });
    if (useAutoselected) {
      log(`Using Distribution Certificate: ${autoselectedCertificate.name}`);
      return autoselectedCertificate;
    }
  }

  if (!options.disableCreate) {
    choices.push({ name: '[Create a new certificate]', value: 'GENERATE' });
  }
  choices.push({ name: '[Upload an existing certificate]', value: 'UPLOAD' });

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
    const isValid = await validateUploadedCertificate(context, distributionCert);
    if (!isValid) {
      return await selectDistributionCert(context);
    }
  }
  return distributionCert;
}

async function validateUploadedCertificate(context, distributionCert) {
  const spinner = ora(
    `Checking validity of distribution certificate on Apple Developer Portal...`
  ).start();

  const formattedDistCertArray = Credentials.Ios.formatDistCerts([distributionCert], {
    provideFullCertificate: true,
  });
  const filteredFormattedDistCertArray = await filterRevokedDistributionCerts(
    context,
    formattedDistCertArray
  );
  const isValidCert = filteredFormattedDistCertArray.length > 0;
  if (isValidCert) {
    const successMsg = `Successfully validated Distribution Certificate you uploaded against Apple Servers`;
    spinner.succeed(successMsg);
  } else {
    const failureMsg = `The Distribution Certificate you uploaded is not valid. Please check that you uploaded your certificate to the Apple Servers. See docs.expo.io/versions/latest/guides/adhoc-builds for more details on uploading your credentials.`;
    spinner.fail(failureMsg);
  }
  return isValidCert;
}

async function chooseUnrevokedDistributionCert(context) {
  const certsOnExpoServer = await Credentials.Ios.getExistingDistCerts(
    context.username,
    context.team.id,
    { provideFullCertificate: true }
  );

  if (certsOnExpoServer.length === 0) {
    return []; // no certs stored on server
  }
  const spinner = ora(
    `Checking validity of distribution certificates on Apple Developer Portal...`
  ).start();

  const validCertsOnExpoServer = await filterRevokedDistributionCerts(context, certsOnExpoServer);

  const numValidCerts = validCertsOnExpoServer.length;
  const numRevokedCerts = certsOnExpoServer.length - validCertsOnExpoServer.length;
  const statusToDisplay = `Distribution Certificate: You have ${numValidCerts} valid and ${numRevokedCerts} revoked certificates on file.`;
  if (numValidCerts > 0) {
    spinner.succeed(statusToDisplay);
  } else {
    spinner.warn(statusToDisplay);
  }

  return validCertsOnExpoServer;
}

async function filterRevokedDistributionCerts(context, distributionCerts) {
  // if the credentials are valid, check it against apple to make sure it hasnt been revoked
  const distCertManager = appleApi.createManagers(context).distributionCert;
  const certsOnAppleServer = await distCertManager.list();
  const validCertSerialsOnAppleServer = certsOnAppleServer
    .filter(
      // remove expired certs
      cert => cert.expires > Math.floor(Date.now() / 1000)
    )
    .map(cert => cert.serialNumber);
  const validCertsOnExpoServer = distributionCerts.filter(cert => {
    const serialNumber = cert.value && cert.value.distCertSerialNumber;
    return validCertSerialsOnAppleServer.includes(serialNumber);
  });
  return validCertsOnExpoServer;
}

async function generateDistributionCert(context) {
  const manager = appleApi.createManagers(context).distributionCert;
  try {
    return await manager.create({});
  } catch (e) {
    if (e.code === 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR') {
      const certificates = await manager.list();
      log.warn(`Maximum number (${certificates.length}) of certificates generated.`);
      const { answer } = await prompt({
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
        return await selectDistributionCert(context, {
          disableCreate: true,
          disableAutoSelectExisting: true,
        });
      }
    }
  }
}
