import simpleSpinner from '@exponent/simple-spinner';

import {
  Simulator,
  UrlUtils,
} from 'xdl';

async function action(projectDir, options) {
  let url = options.url || await UrlUtils.constructManifestUrlAsync(projectDir, {
    hostType: 'localhost',
  });

  await Simulator.openUrlInSimulatorSafeAsync(url, simpleSpinner.start, simpleSpinner.stop);
}

export default (program) => {
  program
    .command('ios [project-dir]')
    .addUrlOption()
    .description("Opens your app in Exponent in an iOS simulator on your computer")
    //.help('You must already have Exponent installed on a simulator on your computer.')
    .asyncActionProjectDir(action);
};
