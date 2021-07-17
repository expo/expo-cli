import chalk from 'chalk';

import Logger from '../Logger';
import * as SimControlLogs from '../SimControlLogs';

jest.mock('../Logger');

describe(SimControlLogs.onMessage, () => {
  it(`logs uncaught exception`, () => {
    SimControlLogs.onMessage({
      traceID: 28814574828650500,
      eventMessage:
        "*** Terminating app due to uncaught exception 'NSInvalidArgumentException', reason: 'Application tried to present modally a view controller <UIViewController: 0x7f87d8516df0> that is already being presented by <UIViewController: 0x7f87da2181f0>.'\n*** First throw call stack:\n(\n\t0   CoreFoundation                      0x00007fff20421af6 __exceptionPreprocess + 242\n\t1   libobjc.A.dylib                     0x00007fff20177e78 objc_exception_throw + 48\n\t2   UIKitCore                           0x00007fff23f76c49 -[UIViewController _presentViewController:withAnimationController:completion:] + 6016\n\t3   UIKitCore                           0x00007fff23f7765a __63-[UIViewController _presentViewController:animated:completion:]_block_invoke + 98\n\t4   UIKitCore                           0x00007fff23f77990 -[UIViewController _performCoordinatedPresentOrDismiss:animated:] + 519\n\t5   UIKitCore                           0x00007fff23f775b8 -[UIViewController _presentViewController:animated:completion:] + 179\n\t6   UIKit<…>",
      eventType: 'logEvent',
      source: { symbol: '__handleUncaughtException', line: 0, image: 'CoreFoundation', file: '' },
      formatString: '%@',
      activityIdentifier: 0,
      subsystem: '',
      category: '',
      timestamp: '2021-03-18 19:36:44.748932-0700',
      machTimestamp: 980181004630259,
      messageType: 'Default',
      processID: 82955,
    });

    expect(Logger.global.info)
      .toHaveBeenLastCalledWith(`${chalk.gray`[CoreFoundation]`} *** Terminating app due to uncaught exception
'NSInvalidArgumentException', reason: 'Application tried to present modally a
view controller <UIViewController: 0x7f87d8516df0> that is already being
presented by <UIViewController: 0x7f87da2181f0>.'
*** First throw call stack:
(
0   CoreFoundation                      0x00007fff20421af6 __exceptionPreprocess
+ 242
1   libobjc.A.dylib                     0x00007fff20177e78 objc_exception_throw
+ 48
2   UIKitCore                           0x00007fff23f76c49 -[UIViewController
_presentViewController:withAnimationController:completion:] + 6016
3   UIKitCore                           0x00007fff23f7765a
__63-[UIViewController _presentViewController:animated:completion:]_block_invoke
+ 98
4   UIKitCore                           0x00007fff23f77990 -[UIViewController
_performCoordinatedPresentOrDismiss:animated:] + 519
5   UIKitCore                           0x00007fff23f775b8 -[UIViewController
_presentViewController:animated:completion:] + 179
6   UIKit<…>`);
  });
  // Seems to be related to AVFoundation
  it(`logs AddInstanceForFactory error`, () => {
    const message: SimControlLogs.SimControlLog = {
      traceID: 29504432492515332,
      eventMessage:
        'AddInstanceForFactory: No factory registered for id <CFUUID 0x60000312c980> F8BB1C28-BAE8-11D6-9C31-00039315CD46',
      eventType: 'logEvent',
      source: {
        symbol: 'CFPlugInAddInstanceForFactory.cold.1',
        line: 0,
        image: 'CoreFoundation',
        file: '',
      },
      formatString: 'AddInstanceForFactory: No factory registered for id %{public}@',
      activityIdentifier: 0,
      subsystem: 'com.apple.CFBundle',
      category: 'plugin',
      timestamp: '2021-03-19 14:37:42.743207-0700',
      machTimestamp: 1048638912471001,
      messageType: 'Error',
      processID: 98499,
    };

    Logger.global.error = jest.fn();
    SimControlLogs.onMessage(message);

    expect(Logger.global.error).toHaveBeenCalled();
  });
});
