// @ts-ignore: no types
import Log from '@expo/bunyan';
import boxen from 'boxen';
import chalk from 'chalk';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import webpack from 'webpack';

// TODO: Replace with something that reports to XDL thru expo/bunyan
export default class WebpackBar extends webpack.ProgressPlugin {
  sendEvent = (name: string, props: any) => {
    this.props.logger.info(
      { tag: 'metro' },
      JSON.stringify({
        tag: 'metro',
        id: Date.now(),
        shouldHide: false,
        type: name,
        ...props,

        // transformedFileCount
        // totalFileCount
        // level: number;
        // _metroEventType?: BuildEventType;
      })
    );
  };

  constructor(public props: { logger: Log; nonInteractive?: boolean }) {
    super((percentage, message, ...args) => {
      if (percentage === 1) {
        this.sendEvent('bundle_build_done', { percentage });
      } else if (percentage === 0) {
        this.sendEvent('bundle_build_started', { percentage });
      } else {
        this.sendEvent('bundle_transform_progressed', { percentage });
      }

      // onStartBuildBundle,
      // onProgressBuildBundle,
      // onFinishBuildBundle,
      // e.g. Output each progress message directly to the console:
      // console.info(percentage, message, ...args);
    });
  }

  isFirstCompile = true;

  apply(compiler: webpack.Compiler) {
    super.apply(compiler);
    // "invalid" event fires when you have changed a file, and Webpack is
    // recompiling a bundle. WebpackDevServer takes care to pause serving the
    // bundle, so if you refresh, it'll wait instead of serving the old one.
    // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
    compiler.hooks.invalid.tap('invalid', () => {
      // log(projectRoot, '\nCompiling...');
    });

    // "done" event fires when Webpack has finished recompiling the bundle.
    // Whether or not you have warnings or errors, you will get this event.
    compiler.hooks.done.tap('done', async stats => {
      if (!this.props.nonInteractive) {
        // clearLogs();
      }

      // We have switched off the default Webpack output in WebpackDevServer
      // options so we are going to "massage" the warnings and errors and present
      // them in a readable focused way.
      // We only construct the warnings and errors for speed:
      // https://github.com/facebook/create-react-app/issues/4492#issuecomment-421959548
      const statsData = stats.toJson({
        all: false,
        warnings: true,
        errors: true,
      });

      const messages = formatWebpackMessages(statsData);

      const isSuccessful = !messages.errors.length && !messages.warnings.length;

      if (isSuccessful) {
        // WebpackEnvironment.logEnvironmentInfo(projectRoot, CONSOLE_TAG, config);
      }

      if (isSuccessful && !this.isFirstCompile && !this.props.nonInteractive) {
        // printInstructions(this.props.projectRoot, {
        //   appName,
        //   urls,
        //   shouldPrintHelp: true,
        //   showInDevtools: this.isFirstCompile,
        // });
      }

      // onFinished();
      this.isFirstCompile = false;

      // If errors exist, only show errors.
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }

        const metroErrors = statsData.errors!.map(error => {
          return {
            ...error,
            // TODO:
            name: 'WebpackError',
            code: error.loc,
            // message: string;
            // chunkName?: string;
            // chunkEntry?: boolean;
            // chunkInitial?: boolean;
            // file?: string;
            // moduleIdentifier?: string;
            // moduleName?: string;
            // loc?: string;
            // chunkId?: string | number;
            // moduleId?: string | number;
            // moduleTrace?: StatsModuleTraceItem[];
            // details?: any;
            // stack?: string;
          };
        });

        for (const error of metroErrors) {
          this.sendEvent('bundling_error', {
            error,
          });
        }

        // logError(this.props.projectRoot, chalk.red('Failed to compile.\n') + messages.errors.join('\n\n'));
        return;
      }

      // Show warnings if no errors were found.
      if (statsData.warnings?.length) {
        for (const warning of statsData.warnings) {
          // TODO: Agnostic format transform here
          this.sendEvent('bundling_warning', {
            warning,
          });
        }
        // logWarning(
        //   this.props.projectRoot,
        //   chalk.yellow('Compiled with warnings.\n') + messages.warnings.join('\n\n')
        // );
      }
    });
  }
}

export function printInstructions(
  projectRoot: string,
  {
    appName,
    urls,
    shouldPrintHelp,
    showInDevtools,
  }: {
    appName: string;
    urls: Urls;
    shouldPrintHelp?: boolean;
    showInDevtools: boolean;
  }
) {
  printPreviewNotice(projectRoot, showInDevtools);

  let message = '\n';
  message += `You can now view ${chalk.bold(appName)} in the browser\n`;

  const divider = chalk.dim`│`;

  if (urls.lanUrlForTerminal) {
    message += `\n \u203A ${chalk.reset('Local')}   ${divider} ${urls.localUrlForTerminal}`;
    message += `\n \u203A ${chalk.reset('LAN')}     ${divider} ${urls.lanUrlForTerminal}`;
  } else {
    message += `\n \u203A ${urls.localUrlForTerminal}`;
  }

  message += '\n';

  message += `\n \u203A Run ${chalk.bold(`expo build:web`)} to optimize and build for production`;

  message += '\n';

  message += `\n \u203A Press ${chalk.bold(`w`)} ${divider} open in the browser`;
  if (shouldPrintHelp) {
    message += `\n \u203A Press ${chalk.bold(`?`)} ${divider} show all commands`;
  }

  console.log(projectRoot, message, showInDevtools);
}

export function printPreviewNotice(projectRoot: string, showInDevtools: boolean) {
  console.log(
    projectRoot,
    boxen(
      chalk.magenta.dim(
        'Expo web is in late beta, please report any bugs or missing features on the Expo repo.\n' +
          'You can follow the V1 release for more info: https://github.com/expo/expo/issues/6782'
      ),
      { dimBorder: true, borderColor: 'magenta', padding: { top: 0, left: 1, bottom: 0, right: 1 } }
    ),
    showInDevtools
  );
}
