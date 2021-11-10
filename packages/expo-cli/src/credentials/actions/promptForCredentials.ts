import fs from 'fs-extra';
import once from 'lodash/once';
import path from 'path';
import untildify from 'untildify';

import Log from '../../log';
import prompts, { Question as PromptQuestion } from '../../utils/prompts';
import * as validators from '../../utils/validators';

export type Question = {
  question: string;
  type: 'file' | 'string' | 'password';
  base64Encode?: boolean;
};

type Results = {
  [key: string]: string | undefined;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type CredentialSchema<T> = {
  id: string;
  canReuse?: boolean;
  dependsOn?: string;
  name: string;
  required: string[];
  questions: {
    [key: string]: Question;
  };
  deprecated?: boolean;
  migrationDocs?: string;
  provideMethodQuestion?: {
    question?: string;
    expoGenerated?: string;
    userProvided?: string;
  };
};

const EXPERT_PROMPT = once(() =>
  Log.warn(`
WARNING! In this mode, we won't be able to make sure that your credentials are valid.
Please double check that you're uploading valid files for your app otherwise you may encounter strange errors!

When building for IOS make sure you've created your App ID on the Apple Developer Portal, that your App ID
is in app.json as \`bundleIdentifier\`, and that the provisioning profile you
upload matches that Team ID and App ID.
`)
);

export async function askForUserProvided<T extends Results>(
  schema: CredentialSchema<T>
): Promise<T | null> {
  if (await willUserProvideCredentialsType(schema)) {
    EXPERT_PROMPT();
    return await getCredentialsFromUser(schema);
  }
  return null;
}

export async function getCredentialsFromUser<T extends Results>(
  credentialType: CredentialSchema<T>
): Promise<T | null> {
  const results: Results = {};
  for (const field of credentialType.required) {
    results[field] = await askQuestionAndProcessAnswer(credentialType?.questions?.[field]);
  }
  return results as T;
}

async function willUserProvideCredentialsType<T>(schema: CredentialSchema<T>) {
  const { answer } = await prompts({
    type: 'select',
    name: 'answer',
    message: schema?.provideMethodQuestion?.question ?? `Will you provide your own ${schema.name}?`,
    choices: [
      {
        title: schema?.provideMethodQuestion?.expoGenerated ?? 'Let Expo handle the process',
        value: false,
      },
      {
        title: schema?.provideMethodQuestion?.userProvided ?? 'I want to upload my own file',
        value: true,
      },
    ],
  });
  return answer;
}

async function askQuestionAndProcessAnswer(definition: Question): Promise<string> {
  const questionObject = buildQuestionObject(definition);
  const { input } = await prompts(questionObject);
  return await processAnswer(definition, input);
}

function buildQuestionObject({ type, question }: Question): PromptQuestion {
  switch (type) {
    case 'string':
      return {
        type: 'text',
        name: 'input',
        message: question,
      };
    case 'file':
      return {
        type: 'text',
        name: 'input',
        message: question,
        format: produceAbsolutePath,
        validate: validators.promptsExistingFile,
      } as PromptQuestion;
    case 'password':
      return {
        type: 'password',
        name: 'input',
        message: question,
        validate: validators.promptsNonEmptyInput,
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
