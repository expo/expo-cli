// A babel-loader which enables you to pass custom options to the api.caller
// which can then be accessed from the babel-presets
module.exports = require('babel-loader').custom(() => {
  return {
    // Extract the `custom` field into the custom options
    customOptions({ custom, ...loader }) {
      return {
        custom,
        loader,
      };
    },
    // Apply the custom options to the api.caller
    config(cfg, { source, customOptions = {} }) {
      for (const option of Object.keys(customOptions)) {
        cfg.options.caller[option] = customOptions[option];
      }
      return {
        ...cfg.options,
      };
    },
    /**
    result(result) {
      // Test the babel output
      if (result.map.sources.includes('/CustomApp.js')) {
        const before = result.map.sourcesContent[0];
        const after = result.code;
      }
      return result;
    },
    */
  };
});
