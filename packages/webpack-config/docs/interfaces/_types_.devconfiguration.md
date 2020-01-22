[@expo/webpack-config](../README.md) › ["types"](../modules/_types_.md) › [DevConfiguration](_types_.devconfiguration.md)

# Interface: DevConfiguration

## Hierarchy

* Configuration

  ↳ **DevConfiguration**

## Index

### Properties

* [amd](_types_.devconfiguration.md#optional-amd)
* [bail](_types_.devconfiguration.md#optional-bail)
* [cache](_types_.devconfiguration.md#optional-cache)
* [context](_types_.devconfiguration.md#optional-context)
* [debug](_types_.devconfiguration.md#optional-debug)
* [devServer](_types_.devconfiguration.md#optional-devserver)
* [devtool](_types_.devconfiguration.md#optional-devtool)
* [entry](_types_.devconfiguration.md#optional-entry)
* [externals](_types_.devconfiguration.md#optional-externals)
* [mode](_types_.devconfiguration.md#optional-mode)
* [module](_types_.devconfiguration.md#optional-module)
* [name](_types_.devconfiguration.md#optional-name)
* [node](_types_.devconfiguration.md#optional-node)
* [optimization](_types_.devconfiguration.md#optional-optimization)
* [output](_types_.devconfiguration.md#optional-output)
* [parallelism](_types_.devconfiguration.md#optional-parallelism)
* [performance](_types_.devconfiguration.md#optional-performance)
* [plugins](_types_.devconfiguration.md#optional-plugins)
* [profile](_types_.devconfiguration.md#optional-profile)
* [recordsInputPath](_types_.devconfiguration.md#optional-recordsinputpath)
* [recordsOutputPath](_types_.devconfiguration.md#optional-recordsoutputpath)
* [recordsPath](_types_.devconfiguration.md#optional-recordspath)
* [resolve](_types_.devconfiguration.md#optional-resolve)
* [resolveLoader](_types_.devconfiguration.md#optional-resolveloader)
* [stats](_types_.devconfiguration.md#optional-stats)
* [target](_types_.devconfiguration.md#optional-target)
* [watch](_types_.devconfiguration.md#optional-watch)
* [watchOptions](_types_.devconfiguration.md#optional-watchoptions)

## Properties

### `Optional` amd

• **amd**? : *undefined | object*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[amd](_types_.devconfiguration.md#optional-amd)*

Defined in node_modules/@types/webpack/index.d.ts:104

Set the value of require.amd and define.amd.

___

### `Optional` bail

• **bail**? : *undefined | false | true*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[bail](_types_.devconfiguration.md#optional-bail)*

Defined in node_modules/@types/webpack/index.d.ts:91

Report the first error as a hard error instead of tolerating it.

___

### `Optional` cache

• **cache**? : *boolean | object*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[cache](_types_.devconfiguration.md#optional-cache)*

Defined in node_modules/@types/webpack/index.d.ts:95

Cache generated modules and chunks to improve performance for multiple incremental builds.

___

### `Optional` context

• **context**? : *undefined | string*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[context](_types_.devconfiguration.md#optional-context)*

Defined in node_modules/@types/webpack/index.d.ts:59

The base directory (absolute path!) for resolving the `entry` option.
If `output.pathinfo` is set, the included pathinfo is shortened to this directory.

___

### `Optional` debug

• **debug**? : *undefined | false | true*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[debug](_types_.devconfiguration.md#optional-debug)*

Defined in node_modules/@types/webpack/index.d.ts:100

Switch loaders to debug mode.

___

### `Optional` devServer

• **devServer**? : *WebpackDevServerConfiguration*

*Overrides void*

*Defined in [packages/webpack-config/src/types.ts:9](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/types.ts#L9)*

___

### `Optional` devtool

• **devtool**? : *Options.Devtool*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[devtool](_types_.devconfiguration.md#optional-devtool)*

Defined in node_modules/@types/webpack/index.d.ts:62

Choose a style of source mapping to enhance the debugging process. These values can affect build and rebuild speed dramatically.

___

### `Optional` entry

• **entry**? : *string | string[] | Entry | EntryFunc*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[entry](_types_.devconfiguration.md#optional-entry)*

Defined in node_modules/@types/webpack/index.d.ts:60

___

### `Optional` externals

• **externals**? : *ExternalsElement | ExternalsElement[]*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[externals](_types_.devconfiguration.md#optional-externals)*

Defined in node_modules/@types/webpack/index.d.ts:75

Specify dependencies that shouldn’t be resolved by webpack, but should become dependencies of the resulting bundle.
The kind of the dependency depends on output.libraryTarget.

___

### `Optional` mode

• **mode**? : *"development" | "production" | "none"*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[mode](_types_.devconfiguration.md#optional-mode)*

Defined in node_modules/@types/webpack/index.d.ts:52

Enable production optimizations or development hints.

___

### `Optional` module

• **module**? : *Module*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[module](_types_.devconfiguration.md#optional-module)*

Defined in node_modules/@types/webpack/index.d.ts:66

Options affecting the normal modules (NormalModuleFactory)

___

### `Optional` name

• **name**? : *undefined | string*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[name](_types_.devconfiguration.md#optional-name)*

Defined in node_modules/@types/webpack/index.d.ts:54

Name of the configuration. Used when loading multiple configurations.

___

### `Optional` node

• **node**? : *Node | false*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[node](_types_.devconfiguration.md#optional-node)*

Defined in node_modules/@types/webpack/index.d.ts:102

Include polyfills or mocks for various node stuff

___

### `Optional` optimization

• **optimization**? : *Options.Optimization*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[optimization](_types_.devconfiguration.md#optional-optimization)*

Defined in node_modules/@types/webpack/index.d.ts:120

Optimization options

___

### `Optional` output

• **output**? : *Output*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[output](_types_.devconfiguration.md#optional-output)*

Defined in node_modules/@types/webpack/index.d.ts:64

Options affecting the output.

___

### `Optional` parallelism

• **parallelism**? : *undefined | number*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[parallelism](_types_.devconfiguration.md#optional-parallelism)*

Defined in node_modules/@types/webpack/index.d.ts:118

Limit the number of parallel processed modules. Can be used to fine tune performance or to get more reliable profiling results

___

### `Optional` performance

• **performance**? : *Performance | false*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[performance](_types_.devconfiguration.md#optional-performance)*

Defined in node_modules/@types/webpack/index.d.ts:116

Performance options

___

### `Optional` plugins

• **plugins**? : *Plugin[]*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[plugins](_types_.devconfiguration.md#optional-plugins)*

Defined in node_modules/@types/webpack/index.d.ts:112

Add additional plugins to the compiler.

___

### `Optional` profile

• **profile**? : *undefined | false | true*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[profile](_types_.devconfiguration.md#optional-profile)*

Defined in node_modules/@types/webpack/index.d.ts:93

Capture timing information for each module.

___

### `Optional` recordsInputPath

• **recordsInputPath**? : *undefined | string*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[recordsInputPath](_types_.devconfiguration.md#optional-recordsinputpath)*

Defined in node_modules/@types/webpack/index.d.ts:108

Load compiler state from a json file.

___

### `Optional` recordsOutputPath

• **recordsOutputPath**? : *undefined | string*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[recordsOutputPath](_types_.devconfiguration.md#optional-recordsoutputpath)*

Defined in node_modules/@types/webpack/index.d.ts:110

Store compiler state to a json file.

___

### `Optional` recordsPath

• **recordsPath**? : *undefined | string*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[recordsPath](_types_.devconfiguration.md#optional-recordspath)*

Defined in node_modules/@types/webpack/index.d.ts:106

Used for recordsInputPath and recordsOutputPath

___

### `Optional` resolve

• **resolve**? : *Resolve*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[resolve](_types_.devconfiguration.md#optional-resolve)*

Defined in node_modules/@types/webpack/index.d.ts:68

Options affecting the resolving of modules.

___

### `Optional` resolveLoader

• **resolveLoader**? : *ResolveLoader*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[resolveLoader](_types_.devconfiguration.md#optional-resolveloader)*

Defined in node_modules/@types/webpack/index.d.ts:70

Like resolve but for loaders.

___

### `Optional` stats

• **stats**? : *Options.Stats*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[stats](_types_.devconfiguration.md#optional-stats)*

Defined in node_modules/@types/webpack/index.d.ts:114

Stats options for logging

___

### `Optional` target

• **target**? : *"web" | "webworker" | "node" | "async-node" | "node-webkit" | "atom" | "electron" | "electron-renderer" | "electron-main" | function*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[target](_types_.devconfiguration.md#optional-target)*

Defined in node_modules/@types/webpack/index.d.ts:89

- "web" Compile for usage in a browser-like environment (default).
- "webworker" Compile as WebWorker.
- "node" Compile for usage in a node.js-like environment (use require to load chunks).
- "async-node" Compile for usage in a node.js-like environment (use fs and vm to load chunks async).
- "node-webkit" Compile for usage in webkit, uses jsonp chunk loading but also supports builtin node.js modules plus require(“nw.gui”) (experimental)
- "atom" Compile for usage in electron (formerly known as atom-shell), supports require for modules necessary to run Electron.
- "electron-renderer" Compile for Electron for renderer process, providing a target using JsonpTemplatePlugin, FunctionModulePlugin for browser
  environments and NodeTargetPlugin and ExternalsPlugin for CommonJS and Electron built-in modules.
- "electron-main" Compile for Electron for main process.
- "atom" Alias for electron-main.
- "electron" Alias for electron-main.

___

### `Optional` watch

• **watch**? : *undefined | false | true*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[watch](_types_.devconfiguration.md#optional-watch)*

Defined in node_modules/@types/webpack/index.d.ts:97

Enter watch mode, which rebuilds on file change.

___

### `Optional` watchOptions

• **watchOptions**? : *Options.WatchOptions*

*Inherited from [DevConfiguration](_types_.devconfiguration.md).[watchOptions](_types_.devconfiguration.md#optional-watchoptions)*

Defined in node_modules/@types/webpack/index.d.ts:98
