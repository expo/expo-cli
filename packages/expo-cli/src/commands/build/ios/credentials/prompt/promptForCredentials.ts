import untildify from 'untildify';
import path from 'path';
import { IosCodeSigning } from '@expo/xdl';
import fs from 'fs-extra';

import { Question } from 'inquirer';
import * as constants from '../constants';
import log from '../../../../../log';
import _prompt from '../../../../../prompt';
import * as validators from '../../../../../validators';
import { AppleCtx } from '../../../../../appleApi';
import { UserParameters } from './getFromParams';

const EXPERT_PROMPT = `
WARNING! In this mode, we won't be able to make sure your Distribution Certificate,
Push Notifications service key or Provisioning Profile are valid. Please double check
that you're uploading valid files for your app otherwise you may encounter strange errors!

Make sure you've created your app ID on the developer portal, that your app ID
is in app.json as \`bundleIdentifier\`, and that the provisioning profile you
upload matches that team ID and app ID.
`;

async function promptForCredentials(
  appleCtx: AppleCtx,
  types: string[],
  printWarning: boolean = true
): Promise<{ credentials: Record<string, any>; metadata: Record<string, any> }> {
  if (printWarning) {
    log(EXPERT_PROMPT);
  }
  const credentials: Record<string, any> = {};
  const metadata: Record<string, any> = {};
  for (const type of types) {
    const value: Record<string, any> = {};
    const { name, required, questions } = constants.CREDENTIALS[type];
    log(`Please provide your ${name}:`);
    for (const i of required) {
      // @ts-ignore: Object is possibly 'undefined'.
      const question = questions[i];
      const answer = await _askQuestionAndProcessAnswer(question);
      value[i] = answer;
    }
    const valueKeys = Object.keys(value);
    credentials[type] = valueKeys.length === 1 ? value[valueKeys[0]] : value;
    Object.assign(metadata, await _calculateMetadata(credentials[type]));
  }

  return { credentials, metadata };
}

async function _askQuestionAndProcessAnswer(definition: {
  type: string;
  base64Encode?: boolean;
  question: string;
}) {
  const questionObject = _buildQuestionObject(definition);
  const { input } = await _prompt(questionObject);
  return await _processAnswer(definition, input);
}

function _buildQuestionObject({ type, question }: { type: string; question: string }): Question {
  const inputType = type === 'password' ? 'password' : 'input';
  const questionObject: any = {
    type: inputType,
    name: 'input',
    message: question,
  };

  if (type === 'file') {
    questionObject.filter = _produceAbsolutePath;
    questionObject.validate = validators.existingFile;
  } else {
    questionObject.validate = validators.nonEmptyInput;
  }

  return questionObject;
}

async function _processAnswer(
  { type, base64Encode }: { type: string; base64Encode?: boolean },
  input: any
): Promise<any | Buffer> {
  if (type === 'file') {
    return fs.readFile(input, base64Encode ? 'base64' : 'utf8');
  } else {
    return input;
  }
}

const _produceAbsolutePath = (filePath: string): string => {
  const untildified = untildify(filePath.trim());
  return !path.isAbsolute(untildified) ? path.resolve(untildified) : untildified;
};

async function _calculateMetadata({
  certP12,
  certPassword,
}: Pick<UserParameters, 'certP12' | 'certPassword'>): Promise<null | {
  distCertSerialNumber: string;
}> {
  if (!(certP12 && certPassword)) {
    return null;
  }
  const distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(certP12, certPassword);
  return { distCertSerialNumber };
}

export default promptForCredentials;
