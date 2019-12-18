import path from 'path';
import untildify from 'untildify';
import fs from 'fs-extra';
import get from 'lodash/get';
import once from 'lodash/once';

import prompt, { Question as PromptQuestion } from '../../prompt';
import log from '../../log';
import * as validators from '../../validators';
import { GoBackError } from '../route';

export type Question = {
  question: string;
  type: 'file' | 'string' | 'password';
  base64Encode?: boolean;
};

type Results = {
  [key: string]: string | undefined;
};

export type CredentialSchema<T> = {
  id: string;
  canReuse?: boolean;
  dependsOn?: string;
  name: string;
  required: Array<string>;
  questions?: {
    [key: string]: Question;
  };
  deprecated?: boolean;
  migrationDocs?: string;
};

const EXPERT_PROMPT = once(() =>
  log.warn(`
WARNING! In this mode, we won't be able to make sure that your crdentials are valid.
Please double check that you're uploading valid files for your app otherwise you may encounter strange errors!

When building for IOS make sure you've created your App ID on the Apple Developer Portal, that your App ID
is in app.json as \`bundleIdentifier\`, and that the provisioning profile you
upload matches that Team ID and App ID.
`)
);

export async function askForUserProvided<T extends Results>(
  schema: CredentialSchema<T>
): Promise<T | null> {
  if (await willUserProvideCredentialsType(schema.name)) {
    EXPERT_PROMPT();
    return await getCredentialsFromUser(schema);
  }
  return null;
}

async function getCredentialsFromUser<T extends Results>(
  credentialType: CredentialSchema<T>
): Promise<T | null> {
  const results: Results = {};
  for (const field of credentialType.required) {
    results[field] = await askQuestionAndProcessAnswer(get(credentialType, `questions.${field}`));
  }
  return results as T;
}

async function willUserProvideCredentialsType(name: string) {
  const { answer } = await prompt({
    type: 'list',
    name: 'answer',
    message: `Will you provide your own ${name}?`,
    choices: [
      { name: 'Let Expo handle the process', value: false },
      { name: 'I want to upload my own file', value: true },
      { name: 'Go back', value: 'GO BACK' },
    ],
  });
  if (answer === 'GO BACK') {
    throw new GoBackError();
  }
  return answer;
}

async function askQuestionAndProcessAnswer(definition: Question): Promise<string> {
  const questionObject = buildQuestionObject(definition);
  const { input } = await prompt(questionObject);
  return await processAnswer(definition, input);
}

function buildQuestionObject({ type, question }: Question): PromptQuestion {
  switch (type) {
    case 'string':
      return {
        type: 'input',
        name: 'input',
        message: question,
      };
    case 'file':
      return {
        type: 'input',
        name: 'input',
        message: question,
        filter: produceAbsolutePath,
        validate: validators.existingFile,
      } as PromptQuestion;
    case 'password':
      return {
        type: 'password',
        name: 'input',
        message: question,
        validate: validators.nonEmptyInput,
      };
  }
}

async function processAnswer({ type, base64Encode }: Question, input: string): Promise<string> {
  if (type === 'file') {
    return fs.readFile(input, base64Encode ? 'base64' : 'utf8');
  } else {
    return input;
  }
}

function produceAbsolutePath(filePath: string): string {
  const untildified = untildify(filePath.trim());
  return !path.isAbsolute(untildified) ? path.resolve(untildified) : untildified;
}
