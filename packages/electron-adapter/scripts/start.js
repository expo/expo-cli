const { ensureElectronConfig } = require('../');

ensureElectronConfig(process.cwd());

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 1;

require('electron-webpack/out/dev/dev-runner');
