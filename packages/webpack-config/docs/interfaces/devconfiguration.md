
# Interface: DevConfiguration

## Hierarchy

* Configuration

  ↳ **DevConfiguration**

## Index

### Properties

* [amd](devconfiguration.md#optional-amd)
* [bail](devconfiguration.md#optional-bail)
* [cache](devconfiguration.md#optional-cache)
* [context](devconfiguration.md#optional-context)
* [debug](devconfiguration.md#optional-debug)
* [devServer](devconfiguration.md#optional-devserver)
* [devtool](devconfiguration.md#optional-devtool)
* [entry](devconfiguration.md#optional-entry)
* [externals](devconfiguration.md#optional-externals)
* [mode](devconfiguration.md#optional-mode)
* [module](devconfiguration.md#optional-module)
* [name](devconfiguration.md#optional-name)
* [node](devconfiguration.md#optional-node)
* [optimization](devconfiguration.md#optional-optimization)
* [output](devconfiguration.md#optional-output)
* [parallelism](devconfiguration.md#optional-parallelism)
* [performance](devconfiguration.md#optional-performance)
* [plugins](devconfiguration.md#optional-plugins)
* [profile](devconfiguration.md#optional-profile)
* [recordsInputPath](devconfiguration.md#optional-recordsinputpath)
* [recordsOutputPath](devconfiguration.md#optional-recordsoutputpath)
* [recordsPath](devconfiguration.md#optional-recordspath)
* [resolve](devconfiguration.md#optional-resolve)
* [resolveLoader](devconfiguration.md#optional-resolveloader)
* [stats](devconfiguration.md#optional-stats)
* [target](devconfiguration.md#optional-target)
* [watch](devconfiguration.md#optional-watch)
* [watchOptions](devconfiguration.md#optional-watchoptions)

## Properties

### `Optional` amd

• **amd**? : *undefined | object*

*Inherited from [DevConfiguration](devconfiguration.md).[amd](devconfiguration.md#optional-amd)*

Set the value of require.amd and define.amd.

___

### `Optional` bail

• **bail**? : *undefined | false | true*

*Inherited from [DevConfiguration](devconfiguration.md).[bail](devconfiguration.md#optional-bail)*

Report the first error as a hard error instead of tolerating it.

___

### `Optional` cache

• **cache**? : *boolean | object*

*Inherited from [DevConfiguration](devconfiguration.md).[cache](devconfiguration.md#optional-cache)*

Cache generated modules and chunks to improve performance for multiple incremental builds.

___

### `Optional` context

• **context**? : *undefined | string*

*Inherited from [DevConfiguration](devconfiguration.md).[context](devconfiguration.md#optional-context)*

The base directory (absolute path!) for resolving the `entry` option.
If `output.pathinfo` is set, the included pathinfo is shortened to this directory.

___

### `Optional` debug

• **debug**? : *undefined | false | true*

*Inherited from [DevConfiguration](devconfiguration.md).[debug](devconfiguration.md#optional-debug)*

Switch loaders to debug mode.

___

### `Optional` devServer

• **devServer**? : *WebpackDevServerConfiguration*

*Overrides void*

___

### `Optional` devtool

• **devtool**? : *Options.Devtool*

*Inherited from [DevConfiguration](devconfiguration.md).[devtool](devconfiguration.md#optional-devtool)*

Choose a style of source mapping to enhance the debugging process. These values can affect build and rebuild speed dramatically.

___

### `Optional` entry

• **entry**? : *string | string[] | Entry | EntryFunc*

*Inherited from [DevConfiguration](devconfiguration.md).[entry](devconfiguration.md#optional-entry)*

___

### `Optional` externals

• **externals**? : *ExternalsElement | ExternalsElement[]*

*Inherited from [DevConfiguration](devconfiguration.md).[externals](devconfiguration.md#optional-externals)*

Specify dependencies that shouldn’t be resolved by webpack, but should become dependencies of the resulting bundle.
The kind of the dependency depends on output.libraryTarget.

___

### `Optional` mode

• **mode**? : *"development" | "production" | "none"*

*Inherited from [DevConfiguration](devconfiguration.md).[mode](devconfiguration.md#optional-mode)*

Enable production optimizations or development hints.

___

### `Optional` module

• **module**? : *Module*

*Inherited from [DevConfiguration](devconfiguration.md).[module](devconfiguration.md#optional-module)*

Options affecting the normal modules (NormalModuleFactory)

___

### `Optional` name

• **name**? : *undefined | string*

*Inherited from [DevConfiguration](devconfiguration.md).[name](devconfiguration.md#optional-name)*

Name of the configuration. Used when loading multiple configurations.

___

### `Optional` node

• **node**? : *Node | false*

*Inherited from [DevConfiguration](devconfiguration.md).[node](devconfiguration.md#optional-node)*

Include polyfills or mocks for various node stuff

___

### `Optional` optimization

• **optimization**? : *Options.Optimization*

*Inherited from [DevConfiguration](devconfiguration.md).[optimization](devconfiguration.md#optional-optimization)*

Optimization options

___

### `Optional` output

• **output**? : *Output*

*Inherited from [DevConfiguration](devconfiguration.md).[output](devconfiguration.md#optional-output)*

Options affecting the output.

___

### `Optional` parallelism

• **parallelism**? : *undefined | number*

*Inherited from [DevConfiguration](devconfiguration.md).[parallelism](devconfiguration.md#optional-parallelism)*

Limit the number of parallel processed modules. Can be used to fine tune performance or to get more reliable profiling results

___

### `Optional` performance

• **performance**? : *Performance | false*

*Inherited from [DevConfiguration](devconfiguration.md).[performance](devconfiguration.md#optional-performance)*

Performance options

___

### `Optional` plugins

• **plugins**? : *Plugin[]*

*Inherited from [DevConfiguration](devconfiguration.md).[plugins](devconfiguration.md#optional-plugins)*

Add additional plugins to the compiler.

___

### `Optional` profile

• **profile**? : *undefined | false | true*

*Inherited from [DevConfiguration](devconfiguration.md).[profile](devconfiguration.md#optional-profile)*

Capture timing information for each module.

___

### `Optional` recordsInputPath

• **recordsInputPath**? : *undefined | string*

*Inherited from [DevConfiguration](devconfiguration.md).[recordsInputPath](devconfiguration.md#optional-recordsinputpath)*

Load compiler state from a json file.

___

### `Optional` recordsOutputPath

• **recordsOutputPath**? : *undefined | string*

*Inherited from [DevConfiguration](devconfiguration.md).[recordsOutputPath](devconfiguration.md#optional-recordsoutputpath)*

Store compiler state to a json file.

___

### `Optional` recordsPath

• **recordsPath**? : *undefined | string*

*Inherited from [DevConfiguration](devconfiguration.md).[recordsPath](devconfiguration.md#optional-recordspath)*

Used for recordsInputPath and recordsOutputPath

___

### `Optional` resolve

• **resolve**? : *Resolve*

*Inherited from [DevConfiguration](devconfiguration.md).[resolve](devconfiguration.md#optional-resolve)*

Options affecting the resolving of modules.

___

### `Optional` resolveLoader

• **resolveLoader**? : *ResolveLoader*

*Inherited from [DevConfiguration](devconfiguration.md).[resolveLoader](devconfiguration.md#optional-resolveloader)*

Like resolve but for loaders.

___

### `Optional` stats

• **stats**? : *Options.Stats*

*Inherited from [DevConfiguration](devconfiguration.md).[stats](devconfiguration.md#optional-stats)*

Stats options for logging

___

### `Optional` target

• **target**? : *"web" | "webworker" | "node" | "async-node" | "node-webkit" | "atom" | "electron" | "electron-renderer" | "electron-main" | function*

*Inherited from [DevConfiguration](devconfiguration.md).[target](devconfiguration.md#optional-target)*

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

*Inherited from [DevConfiguration](devconfiguration.md).[watch](devconfiguration.md#optional-watch)*

Enter watch mode, which rebuilds on file change.

___

### `Optional` watchOptions

• **watchOptions**? : *Options.WatchOptions*

*Inherited from [DevConfiguration](devconfiguration.md).[watchOptions](devconfiguration.md#optional-watchoptions)*
