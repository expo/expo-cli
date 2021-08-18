import { parseXcrunError } from '../SimControl';

describe(parseXcrunError, () => {
  it(`parses exit code 2`, () => {
    // Test that a useful error message is created.

    expect(
      parseXcrunError({
        message: 'xcrun exited with non-zero code: 2',
        pid: 8887,
        output: [
          '',
          'An error was encountered processing the command (domain=NSPOSIXErrorDomain, code=2):\n' +
            'Unable to boot device because we cannot determine the runtime bundle.\n' +
            'No such file or directory\n',
        ],
        stdout: '',
        stderr:
          'An error was encountered processing the command (domain=NSPOSIXErrorDomain, code=2):\n' +
          'Unable to boot device because we cannot determine the runtime bundle.\n' +
          'No such file or directory\n',
        status: 2,
        signal: null,
      }).message
    ).toBe(
      [
        // The standard error
        'xcrun exited with non-zero code: 2',
        // Extra input added on in the wrapper method
        'An error was encountered processing the command (domain=NSPOSIXErrorDomain, code=2):',
        'Unable to boot device because we cannot determine the runtime bundle.',
        'No such file or directory',
      ].join('\n')
    );
  });
});
