const path = require('path');
const process = require('process');

const { Webpack } = require('../../xdl');

async function main(args) {
  const projectRoot = path.resolve(args[0]);
  console.log('Building', projectRoot);
  try {
    await Webpack.bundleAsync(projectRoot, {
      nonInteractive: true,
      pwa: false,
      verbose: true,
      mode: 'production',
    });
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}
