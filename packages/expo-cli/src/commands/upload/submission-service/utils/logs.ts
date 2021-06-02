import got from 'got';

import { default as Logger } from '../../../../log';
import { Submission, SubmissionStatus } from '../SubmissionService.types';
import { printSubmissionError } from './errors';

async function displayLogs(
  submission: Submission | null,
  status: SubmissionStatus | null,
  verbose: boolean
): Promise<void> {
  let printedUnknownError = false;
  if (status === SubmissionStatus.ERRORED && submission?.submissionInfo?.error) {
    printedUnknownError = printSubmissionError(submission.submissionInfo.error);
  }
  if ((printedUnknownError || verbose) && submission) {
    await downloadAndPrintSubmissionLogs(submission);
  }
}

async function downloadAndPrintSubmissionLogs(submission: Submission): Promise<void> {
  if (!submission.submissionInfo?.logsUrl) {
    return;
  }
  const { body: data } = await got.get(submission.submissionInfo.logsUrl);
  const logs = parseLogs(data);
  Logger.addNewLineIfNone();
  const prefix = Logger.chalk.blueBright('[logs] ');
  for (const { level, msg } of logs) {
    const msgWithPrefix = `${prefix}${msg}`;
    if (level === 'error') {
      Logger.error(msgWithPrefix);
    } else if (level === 'warn') {
      Logger.warn(msgWithPrefix);
    } else {
      Logger.log(msgWithPrefix);
    }
  }
}

interface Log {
  level: 'error' | 'warn' | 'info';
  msg: string;
}

function parseLogs(logs: string): Log[] {
  const lines = logs.split('\n');
  const result: Log[] = [];
  for (const line of lines) {
    let parsedLine;
    try {
      parsedLine = JSON.parse(line);
    } catch (error) {
      continue;
    }
    let level: Log['level'];
    const { level: levelNumber, msg } = parsedLine;
    if (levelNumber >= 50) {
      level = 'error';
    } else if (levelNumber >= 40) {
      level = 'warn';
    } else {
      level = 'info';
    }
    result.push({ level, msg });
  }
  return result;
}

export { displayLogs };
