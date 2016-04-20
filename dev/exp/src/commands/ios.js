var simpleSpinner = require('@exponent/simple-spinner');

import {
  Simulator,
  UrlUtils,
} from 'xdl';

var log = require('../log');

async function action(projectDir, options) {

  let url = options.url || await UrlUtils.constructManifestUrlAsync(projectDir, {
    localhost: true,
  });

  await Simulator.openUrlInSimulatorSafeAsync(url, log, log, simpleSpinner.start, simpleSpinner.stop);
}

module.exports = (program) => {
  program
    .command('ios [project-dir]')
    .addUrlOption()
    .description("Opens your app in Exponent in an iOS simulator on your computer")
    //.help('You must already have Exponent installed on a simulator on your computer.')
    .asyncActionProjectDir(action)
    ;
};
