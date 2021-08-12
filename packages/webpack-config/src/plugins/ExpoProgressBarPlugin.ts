// @ts-ignore: no types
import Log from '@expo/bunyan';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import utils from 'util';
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

  constructor(
    public props: {
      logger: Log;
      nonInteractive?: boolean;
      bundleDetails: {
        bundleType: 'bundle';
        minify?: boolean;
        dev?: boolean;
        entryFile?: string | null;
        platform?: string;
      };
    }
  ) {
    super((percentage, message, ...args) => {
      const { buildID } = this;
      if (percentage === 1) {
        this.sendEvent('bundle_build_done', { percentage, buildID });
      } else if (percentage === 0) {
        this.sendEvent('bundle_build_started', {
          percentage,
          buildID,
          bundleDetails: props.bundleDetails,
        });
      } else {
        this.sendEvent('bundle_transform_progressed', { percentage, buildID });
      }
    });
  }

  private isFirstCompile = true;

  // Add some offset from Metro
  _nextBundleBuildID = 999;

  getNewBuildID(): string {
    return (this._nextBundleBuildID++).toString(36);
  }

  buildID: string = '';

  apply(compiler: webpack.Compiler) {
    this.buildID = this.getNewBuildID();

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

      // const isSuccessful = !messages.errors.length && !messages.warnings.length;
      this.isFirstCompile = false;

      if (stats.hasErrors()) {
        // If errors exist, only show errors.
        if (messages.errors.length) {
          // Only keep the first error. Others are often indicative
          // of the same problem, but confuse the reader with noise.
          if (messages.errors.length > 1) {
            messages.errors.length = 1;
          }

          const metroErrors = statsData.errors!.map(error => {
            return {
              // ...error,
              message: error,
              // TODO:
              name: 'WebpackError',
              // code: error.loc,
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

          this.sendEvent('bundle_build_failed', {
            buildID: this.buildID,
            bundleOptions: this.props.bundleDetails,
          });

          for (const error of metroErrors) {
            this.sendEvent('bundling_error', {
              error,
            });
          }

          // logError(this.props.projectRoot, chalk.red('Failed to compile.\n') + messages.errors.join('\n\n'));
          return;
        }
      }

      // Show warnings if no errors were found.
      if (statsData.warnings?.length) {
        for (const warning of statsData.warnings) {
          // TODO: Agnostic format transform here
          this.sendEvent('bundling_warning', {
            warning,
          });
        }
      }
    });
  }
}
