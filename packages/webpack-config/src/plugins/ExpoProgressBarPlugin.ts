import Log from '@expo/bunyan';
import webpack from 'webpack';

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
      })
    );
  };

  constructor(
    public props: {
      logger: Log;
      nonInteractive?: boolean;
      bundleDetails: {
        bundleType: 'bundle' | 'delta' | 'meta' | 'map' | 'ram' | 'cli' | 'hmr' | 'todo' | 'graph';
        minify?: boolean;
        dev?: boolean;
        entryFile?: string | null;
        platform?: string;
      };
    }
  ) {
    super(percentage => {
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
      this.props.bundleDetails.bundleType = 'hmr';
    });

    compiler.hooks.done.tap('done', async stats => {
      const statsData = stats.toJson({
        all: false,
        warnings: true,
        errors: true,
      });

      if (stats.hasErrors()) {
        const metroErrors = statsData.errors!.map(error => {
          return {
            message: error,
            name: 'WebpackError',
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

        return;
      }

      // Show warnings if no errors were found.
      if (statsData.warnings?.length) {
        for (const warning of statsData.warnings) {
          this.sendEvent('bundling_warning', {
            warning,
          });
        }
      }
    });
  }
}
