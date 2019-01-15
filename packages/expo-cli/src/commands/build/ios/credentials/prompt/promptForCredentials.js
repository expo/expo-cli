import untildify from 'untildify';
import path from 'path';
import { IosCodeSigning } from 'xdl';
import fs from 'fs-extra';

import * as constants from '../constants';
import log from '../../../../../log';
import _prompt from '../../../../../prompt';
import * as validators from '../../../../utils/validators';

const EXPERT_PROMPT = `
WARNING! In this mode, we won't be able to make sure your Distribution Certificate,
Push Notifications service key or Provisioning Profile are valid. Please double check
that you're uploading valid files for your app otherwise you may encounter strange errors!

Make sure you've created your app ID on the developer portal, that your app ID
is in app.json as \`bundleIdentifier\`, and that the provisioning profile you
upload matches that team ID and app ID.
`;

async function promptForCredentials(appleCtx, types, printWarning = true) {
  if (printWarning) {
    log(EXPERT_PROMPT);
  }
  const credentials = {};
  for (const type of types) {
    const value = {};
    const { name, required, questions } = constants.CREDENTIALS[type];
    log(`Please provide your ${name}:`);
    for (const i of required) {
      const question = questions[i];
      const answer = await _askQuestionAndProcessAnswer(question);
      value[i] = answer;
    }
    const valueKeys = Object.keys(value);
    credentials[type] = valueKeys.length === 1 ? value[valueKeys[0]] : value;
  }

  const metadata = await _calculateMetadata(credentials);

  return [credentials, metadata];
}

async function _askQuestionAndProcessAnswer(definition) {
  const questionObject = _buildQuestionObject(definition);
  const { input } = await _prompt(questionObject);
  return await _processAnswer(definition, input);
}

function _buildQuestionObject({ type, question }) {
  const inputType = type === 'password' ? 'password' : 'input';
  const questionObject = {
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

async function _processAnswer({ type, base64Encode }, input) {
  if (type === 'file') {
    return fs.readFile(input, base64Encode ? 'base64' : 'utf8');
  } else {
    return input;
  }
}

const _produceAbsolutePath = filePath => {
  const untildified = untildify(filePath.trim());
  return !path.isAbsolute(untildified) ? path.resolve(untildified) : untildified;
};

async function _calculateMetadata({ certP12, certPassword }) {
  if (!(certP12 && certPassword)) {
    return null;
  }
  const distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(certP12, certPassword);
  return { distCertSerialNumber };
}

export default promptForCredentials;
