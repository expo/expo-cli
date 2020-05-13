import { SubmissionError } from '../SubmissionService';
import log from '../../../../log';

enum SubmissionErrorCode {
  ANDROID_UNKNOWN_ERROR = 'SUBMISSION_SERVICE_ANDROID_UNKNOWN_ERROR',
  ANDROID_FIRST_UPLOAD_ERROR = 'SUBMISSION_SERVICE_ANDROID_FIRST_UPLOAD_ERROR',
}

const SubmissionErrorMessages: Record<SubmissionErrorCode, string> = {
  [SubmissionErrorCode.ANDROID_UNKNOWN_ERROR]:
    "We couldn't figure out what went wrong. Please see logs to learn more.",
  [SubmissionErrorCode.ANDROID_FIRST_UPLOAD_ERROR]:
    'TODO(improve this message) First submission of the app needs to be performed manually.',
};

function printSubmissionError(error: SubmissionError): void {
  if ((Object.values(SubmissionErrorCode) as string[]).includes(error.errorCode)) {
    const errorCode = error.errorCode as SubmissionErrorCode;
    log.addNewLineIfNone();
    if (errorCode !== SubmissionErrorCode.ANDROID_UNKNOWN_ERROR) {
      log('Try the following tip to fix the error:');
    }
    log(SubmissionErrorMessages[errorCode]);
  } else {
    log(error.message);
  }
}

export { printSubmissionError };
