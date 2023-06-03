#!/usr/bin/env node

import {
  App,
  Auth,
  BundleId,
  CapabilityType,
  CapabilityTypeOption,
  Teams,
} from '@expo/apple-utils';
import { getConfig } from '@expo/config';
import chalk from 'chalk';
import { Command } from 'commander';
import { constants } from 'os';
import path, { resolve } from 'path';
import prompts, { Answers, Choice, Options, PromptType, PromptObject as Question } from 'prompts';

import { generateAasaJson } from './aasa';

const packageJSON = require('../package.json');

let projectRoot: string = '';

export { PromptType, Question, Choice };

export interface ExpoChoice<T> extends Choice {
  value: T;
}

export async function promptAsync<T extends string = string>(
  questions: Question<T> | Question<T>[],
  options: Options = {}
): Promise<Answers<T>> {
  if (!process.stdin.isTTY && !global.test) {
    const message = Array.isArray(questions) ? questions[0]?.message : questions.message;
    throw new Error(
      `Input is required, but stdin is not readable. Failed to display prompt: ${message}`
    );
  }
  return await prompts<T>(questions, {
    onCancel() {
      process.exit(constants.signals.SIGINT + 128); // Exit code 130 used when process is interrupted with ctrl+c.
    },
    ...options,
  });
}

async function promptForAppNameAsync(projectRoot: string): Promise<string> {
  const { appName } = await promptAsync({
    type: 'text',
    name: 'appName',
    initial: path.basename(projectRoot),
    message: 'What would you like to name your app?',
    validate: (val: string) => val !== '' || 'App name cannot be empty!',
  });
  return appName;
}

function printCredentialSnippets({
  appId,
  bundleId,
  teamId,
}: {
  appId: string;
  teamId: string;
  bundleId: string;
}) {
  console.log(
    chalk.bold`Here's your {underline public/.well-known/apple-app-site-association} file:`
  );
  console.log();
  console.log(JSON.stringify(generateAasaJson([{ bundleId, teamId }]), null, 2));

  console.log();
  console.log();

  console.log(
    chalk.bold`Add the following meta tag to the <head> of your website {dim ({underline app/+html.tsx} in Expo Router)}:`
  );
  console.log();
  console.log(`<meta name="apple-itunes-app" content="app-id=${appId}" />`);
}

async function setupAppleCredentialsAsync(
  projectRoot: string,
  {
    username,
    bundleId = getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp.ios
      ?.bundleIdentifier,
  }: {
    username?: string;
    bundleId?: string;
  }
) {
  const { context } = await Auth.loginAsync({
    username,
  });

  if (!bundleId) {
    bundleId = (
      await promptAsync({
        type: 'text',
        name: 'value',
        message: 'Select a bundle identfier',
        initial: 'app.expo.' + path.basename(projectRoot),
        validate: (val: string) => /^[a-zA-Z0-9-.]+$/.test(val) || 'Invalid bundle identifier',
      })
    ).value as string;
  }

  const teamId =
    context.teamId ?? process.env.EXPO_APPLE_TEAM_ID ?? (await Teams.selectTeamAsync()).teamId;

  const existing =
    (await BundleId.findAsync(context, { identifier: bundleId })) ??
    (await BundleId.createAsync(context, { name: bundleId, identifier: bundleId }));

  console.log('Enabling associated domains...');
  await existing.updateBundleIdCapabilityAsync([
    {
      capabilityType: CapabilityType.ASSOCIATED_DOMAINS,
      option: CapabilityTypeOption.ON,
    },
  ]);
  console.log(
    chalk.dim(
      'Bundle ID ready: https://developer.apple.com/account/resources/identifiers/bundleId/edit/' +
        existing.id
    )
  );

  let app = await App.findAsync(context, { bundleId: existing.attributes.identifier });

  if (!app) {
    console.log('Creating app entry...');
    app = await App.createAsync(context, {
      bundleId: existing.attributes.identifier,
      name: await promptForAppNameAsync(projectRoot),
    });
  }
  console.log(
    chalk.dim(
      `App entry ready: https://appstoreconnect.apple.com/apps/${existing.id}/appstore/info`
    )
  );

  return {
    teamId,
    bundleId: app.attributes.bundleId,
    appId: app.id,
  };
}

const program = new Command(packageJSON.name)
  .version(packageJSON.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .description('Setup Apple authentication for web projects')
  .option('--email [email]', 'Apple User ID')
  .option('--bundle-id [bundle-id]', 'Apple Bundle Identifier')
  .option('--app-name [app-name]', 'Optional app name for new app if one does not exist')
  .option('--non-interactive', 'Disable interactive prompts')
  .action((inputProjectRoot: string) => (projectRoot = inputProjectRoot))
  .allowUnknownOption()
  .parse(process.argv);

async function runAsync(): Promise<void> {
  if (typeof projectRoot === 'string') {
    projectRoot = projectRoot.trim();
  }
  projectRoot = resolve(projectRoot);

  const creds = await setupAppleCredentialsAsync(projectRoot, {
    bundleId: program.bundleId,
    username: program.email,
  });

  console.log();
  console.log('Credentials:');
  console.log(`  Team ID: ${chalk.green(creds.teamId)}`);
  console.log(`  iTunes ID: ${chalk.green(creds.appId)}`);
  console.log(`  Bundle ID: ${chalk.green(creds.bundleId)}`);
  console.log();
  await printCredentialSnippets(creds);
  console.log();
}

(async () => {
  program.parse(process.argv);
  try {
    await runAsync();
  } catch (reason: any) {
    console.error(chalk.red(reason.message));
    console.error(chalk.gray(reason.stack));
    process.exit(1);
  }
})();
