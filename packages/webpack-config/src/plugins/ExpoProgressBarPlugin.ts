import chalk from 'chalk';
// @ts-ignore
import ProgressBarPlugin from 'progress-bar-webpack-plugin';

// @ts-ignore
export default class ExpoProgressBarPlugin extends ProgressBarPlugin {
  constructor() {
    super({
      format: `[:bar] ${chalk.green.bold(':percent')} (:elapsed seconds)`,
      clear: false,
      complete: '=',
      incomplete: ' ',
      summary: false,
    });
  }
}
