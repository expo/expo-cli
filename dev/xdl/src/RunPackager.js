let path = require('path');

let Exp = require('./Exp');
let PackagerController = require('./PackagerController');

module.exports = {
  runAsync: async function (env) {
    if (!env.root) {
      throw new Error("Can't run packager without `env.root` defined");
    }

    if (!env.entryPoint) {
      env.entryPoint = await Exp.determineEntryPointAsync(env.root);
    }

    let pc = new PackagerController({
      absolutePath: path.resolve(env.root),
      entryPoint: env.entryPoint,
    });

    // Write the recent Exps JSON file
    await Exp.saveRecentExpRootAsync(env.root);

    return pc;
  }
};
