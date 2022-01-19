import * as LoadingView from './LoadingView';

let isErrorHandlingEnabled = false;

declare const ErrorUtils: { getGlobalHandler: Function; setGlobalHandler: Function };

module.exports = {
  setEditorHandler(
    callback: (errorLocation: { fileName: string; lineNumber?: number; colNumber?: number }) => void
  ) {
    // @ts-ignore
    if (global.ErrorUtils) {
      // @ts-ignore
      const originalErrorHandler = global.ErrorUtils.getGlobalHandler();
      // @ts-ignore
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.info(error, isFatal);
        // callback(error);
        //   if (
        //     isFatal &&
        //     (error.message.includes('Native module cannot be null') ||
        //       error.message.includes(
        //         `from NativeViewManagerAdapter isn't exported by @unimodules/react-native-adapter. Views of this type may not render correctly. Exported view managers: `
        //       ))
        //   ) {
        //     console.log('Caught require error');
        //   } else {
        // originalErrorHandler(error, isFatal);
        //   }
      });
    }

    console.log('noop:setEditorHandler');
  },
  startReportingRuntimeErrors(options: { onError: Function; filename: string }) {
    console.log('noop:startReportingRuntimeErrors', options);

    isErrorHandlingEnabled = true;
    // const { ErrorUtils } = require('react-native');
    if ('getGlobalHandler' in ErrorUtils) {
      const globalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        if (isErrorHandlingEnabled) {
          // errorHandler(originalHandler, error, isFatal);
          // return;
          // TODO: symbolication disabling for compiler errors?
        }

        globalHandler(error, isFatal);
      });
    }
  },
  stopReportingRuntimeErrors() {
    isErrorHandlingEnabled = false;
    console.log('noop:stopReportingRuntimeErrors');
  },
  reportBuildError(error: any) {
    console.log('noop:reportBuildError', error);
  },
  dismissBuildError() {
    return LoadingView.dismissBuildError();
  },
};
