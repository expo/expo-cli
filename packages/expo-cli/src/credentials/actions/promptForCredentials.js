/* @flow */
import path from 'path';
import untildify from 'untildify';
import fs from 'fs-extra';
import get from 'lodash/get';

import prompt from '../../prompt';
import log from '../../log';
import * as validators from '../../validators';
import type { Question, CredentialSchema, Context } from '../schema';

const EXPERT_PROMPT = `
WARNING! In this mode, we won't be able to make sure your Distribution Certificate,
Push Notifications service key or Provisioning Profile are valid. Please double check
that you're uploading valid files for your app otherwise you may encounter strange errors!

Make sure you've created your app ID on the developer portal, that your app ID
is in app.json as \`bundleIdentifier\`, and that the provisioning profile you
upload matches that team ID and app ID.
`;

export async function askForUserProvided(ctx: Context, credentialType: CredentialSchema) {
  if (await willUserProvideCredentialsType(credentialType.name)) {
    log.warn(EXPERT_PROMPT);
    return await getCredentialsFromUser(credentialType);
  }
}

async function getCredentialsFromUser(credentialType: CredentialSchema) {
  const results = {};
  for (const field of credentialType.required) {
    results[field] = askQuestionAndProcessAnswer(get(credentialType, `questions.${field}`));
  }
}

async function willUserProvideCredentialsType(name: string) {
  const { answer } = await prompt({
    type: 'list',
    name: 'answer',
    message: `Will you provide your own ${name}?`,
    choices: [
      { name: 'Let Expo handle the process', value: false },
      { name: 'I want to upload my own file', value: true },
    ],
  });
  return answer;
}

async function askQuestionAndProcessAnswer(definition: Question) {
  const questionObject = buildQuestionObject(definition);
  const { input } = await prompt(questionObject);
  return await processAnswer(definition, input);
}

function buildQuestionObject({ type, question }: Question) {
  const inputType = type === 'password' ? 'password' : 'input';
  const questionObject = {
    type: inputType,
    name: 'input',
    message: question,
    filter: undefined,
    validate: undefined,
  };

  if (type === 'file') {
    questionObject.filter = produceAbsolutePath;
    questionObject.validate = validators.existingFile;
  } else {
    questionObject.validate = validators.nonEmptyInput;
  }

  return questionObject;
}

async function processAnswer({ type, base64Encode }, input) {
  if (type === 'file') {
    return fs.readFile(input, base64Encode ? 'base64' : 'utf8');
  } else {
    return input;
  }
}

function produceAbsolutePath(filePath) {
  const untildified = untildify(filePath.trim());
  return !path.isAbsolute(untildified) ? path.resolve(untildified) : untildified;
}
