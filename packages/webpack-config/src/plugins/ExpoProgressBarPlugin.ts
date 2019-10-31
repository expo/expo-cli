/**
 * Fork of https://github.com/clessg/progress-bar-webpack-plugin
 * but with TS
 */

import chalk from 'chalk';
import ProgressBar from 'progress';
import { ProgressPlugin } from 'webpack';

export default class ExpoProgressBarPlugin extends ProgressPlugin {
  constructor() {
    const stream = process.stderr;
    const enabled = stream && stream.isTTY;

    if (!enabled) {
      super();
      return;
    }

    var barLeft = chalk.bold('[');
    var barRight = chalk.bold(']');
    var preamble = chalk.cyan.bold('  build ') + barLeft;

    //`[:bar] ${chalk.green.bold(':percent')} (:elapsed seconds)`
    var barFormat = preamble + ':bar' + barRight + chalk.magenta.bold(' :percent');
    var summary = true;

    const barOptions = {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: 100,
      clear: false,
    };

    const bar = new ProgressBar(barFormat, barOptions);

    let running = false;
    let startTime = 0;
    let lastPercent = 0;

    super((percent, msg) => {
      if (!running && lastPercent !== 0) {
        stream.write('\n');
      }

      var newPercent = Math.floor(percent * barOptions.width);

      if (lastPercent < newPercent || newPercent === 0) {
        bar.update(percent, {
          msg,
        });
        lastPercent = newPercent;
      }

      if (!running) {
        running = true;
        startTime = Date.now();
        lastPercent = 0;
      } else if (percent === 1) {
        var now = Date.now();
        var buildTime = (now - startTime) / 1000 + 's';

        bar.terminate();

        if (summary) {
          stream.write(chalk.green.bold('Build completed in ' + buildTime + '\n\n'));
        }

        running = false;
      }
    });
  }
}
