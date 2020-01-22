
# @expo/webpack-config

## Index

### plugins Classes

* [ExpoDefinePlugin](classes/expodefineplugin.md)
* [ExpoHtmlWebpackPlugin](classes/expohtmlwebpackplugin.md)
* [ExpoInterpolateHtmlPlugin](classes/expointerpolatehtmlplugin.md)
* [ExpoProgressBarPlugin](classes/expoprogressbarplugin.md)

### Interfaces

* [Arguments](interfaces/arguments.md)
* [DevConfiguration](interfaces/devconfiguration.md)
* [FilePaths](interfaces/filepaths.md)
* [FilePathsFolder](interfaces/filepathsfolder.md)
* [LoaderItem](interfaces/loaderitem.md)
* [PluginItem](interfaces/pluginitem.md)
* [RuleItem](interfaces/ruleitem.md)

### Type aliases

* [AnyConfiguration](README.md#anyconfiguration)
* [DevServerOptions](README.md#devserveroptions)
* [Environment](README.md#environment)
* [InputEnvironment](README.md#inputenvironment)
* [LoaderItemLoaderPart](README.md#loaderitemloaderpart)
* [Mode](README.md#mode)
* [PathResolver](README.md#pathresolver)
* [Report](README.md#report)
* [ResolvedRuleSet](README.md#resolvedruleset)
* [SelectiveEnv](README.md#selectiveenv)

### Variables

* [environmentSchema](README.md#const-environmentschema)
* [excludedRootPaths](README.md#const-excludedrootpaths)
* [host](README.md#const-host)
* [includeModulesThatContainPaths](README.md#const-includemodulesthatcontainpaths)
* [parsedPackageNames](README.md#const-parsedpackagenames)
* [reportSchema](README.md#const-reportschema)
* [warned](README.md#let-warned)

### addons Functions

* [withAlias](README.md#withalias)
* [withCompression](README.md#withcompression)
* [withDevServer](README.md#withdevserver)
* [withEntry](README.md#withentry)
* [withNodeMocks](README.md#withnodemocks)
* [withOptimizations](README.md#withoptimizations)
* [withReporting](README.md#withreporting)
* [withTypeScriptAsync](README.md#withtypescriptasync)
* [withUnimodules](README.md#withunimodules)
* [withWorkbox](README.md#withworkbox)

### default Functions

* [createWebpackConfigAsync](README.md#createwebpackconfigasync)

### env Functions

* [getAbsolute](README.md#getabsolute)
* [getConfig](README.md#getconfig)
* [getMode](README.md#getmode)
* [getModuleFileExtensions](README.md#getmodulefileextensions)
* [getPaths](README.md#getpaths)
* [getPathsAsync](README.md#getpathsasync)
* [getProductionPath](README.md#getproductionpath)
* [getPublicPaths](README.md#getpublicpaths)
* [getServedPath](README.md#getservedpath)
* [validateEnvironment](README.md#validateenvironment)
* [validateReport](README.md#validatereport)

### internal Functions

* [colorizeKeys](README.md#colorizekeys)
* [default](README.md#default)
* [ensureRoot](README.md#ensureroot)
* [generateCacheIdentifier](README.md#generatecacheidentifier)
* [getDevtool](README.md#getdevtool)
* [getModule](README.md#const-getmodule)
* [getOutput](README.md#getoutput)
* [isFunction](README.md#isfunction)
* [isObject](README.md#isobject)
* [isValidMode](README.md#isvalidmode)
* [loaderToLoaderItemLoaderPart](README.md#loadertoloaderitemloaderpart)
* [logAutoConfigValuesAsync](README.md#logautoconfigvaluesasync)
* [logEnvironment](README.md#logenvironment)
* [logFooter](README.md#logfooter)
* [logHeader](README.md#logheader)
* [logMdHelper](README.md#logmdhelper)
* [logPackage](README.md#logpackage)
* [logStaticsAsync](README.md#logstaticsasync)
* [logWebpackConfigComponents](README.md#logwebpackconfigcomponents)
* [packageNameFromPath](README.md#packagenamefrompath)
* [parsePaths](README.md#parsepaths)
* [setDeepValue](README.md#setdeepvalue)
* [shouldWarnDeprecated](README.md#shouldwarndeprecated)
* [testBabelPreset](README.md#testbabelpreset)

### loaders Functions

* [createAllLoaders](README.md#createallloaders)
* [createBabelLoader](README.md#createbabelloader)
* [createFontLoader](README.md#createfontloader)
* [getAllLoaderRules](README.md#getallloaderrules)
* [getBabelLoaderRule](README.md#getbabelloaderrule)
* [getBabelLoaderRuleFromEnv](README.md#getbabelloaderrulefromenv)
* [getHtmlLoaderRule](README.md#gethtmlloaderrule)

### utils Functions

* [conditionMatchesFile](README.md#conditionmatchesfile)
* [enableWithPropertyOrConfig](README.md#enablewithpropertyorconfig)
* [findLoader](README.md#findloader)
* [getLoaders](README.md#getloaders)
* [getLoadersFromRules](README.md#getloadersfromrules)
* [getPlugins](README.md#getplugins)
* [getPluginsByName](README.md#getpluginsbyname)
* [getRules](README.md#getrules)
* [getRulesAsItems](README.md#getrulesasitems)
* [getRulesByMatchingFiles](README.md#getrulesbymatchingfiles)
* [getRulesFromRules](README.md#getrulesfromrules)
* [isEntry](README.md#isentry)
* [isRuleSetItem](README.md#isrulesetitem)
* [isRuleSetLoader](README.md#isrulesetloader)
* [overrideWithPropertyOrConfig](README.md#overridewithpropertyorconfig)
* [resolveEntryAsync](README.md#resolveentryasync)
* [resolveRuleSetUse](README.md#resolverulesetuse)
* [rulesMatchAnyFiles](README.md#rulesmatchanyfiles)

### internal Object literals

* [DEFAULT_MINIFY](README.md#const-default_minify)
* [DEFAULT_REPORT](README.md#const-default_report)
* [defaultGenerateSWOptions](README.md#const-defaultgenerateswoptions)
* [defaultInjectManifestOptions](README.md#const-defaultinjectmanifestoptions)
* [runtimeCache](README.md#const-runtimecache)

### loaders Object literals

* [fallbackLoaderRule](README.md#const-fallbackloaderrule)
* [imageLoaderRule](README.md#const-imageloaderrule)
* [styleLoaderRule](README.md#const-styleloaderrule)

## Type aliases

###  AnyConfiguration

Ƭ **AnyConfiguration**: *Configuration | [DevConfiguration](interfaces/devconfiguration.md)*

___

###  DevServerOptions

Ƭ **DevServerOptions**: *object*

#### Type declaration:

* **allowedHost**? : *undefined | string*

* **proxy**? : *ProxyConfigMap | ProxyConfigArray*

___

###  Environment

Ƭ **Environment**: *object*

#### Type declaration:

* **config**(): *object*

* **https**: *boolean*

* **info**: *boolean*

* **locations**: *[FilePaths](interfaces/filepaths.md)*

* **mode**: *[Mode](README.md#mode)*

* **platform**: *"ios" | "android" | "web" | "electron"*

* **polyfill**? : *undefined | false | true*

* **projectRoot**: *string*

* **pwa**? : *undefined | false | true*

* **removeUnusedImportExports**? : *undefined | false | true*

* **report**? : *[Report](README.md#report)*

___

###  InputEnvironment

Ƭ **InputEnvironment**: *object*

#### Type declaration:

* **config**? : *undefined | object*

* **development**? : *undefined | false | true*

* **https**? : *undefined | false | true*

* **info**? : *undefined | false | true*

* **locations**? : *[FilePaths](interfaces/filepaths.md)*

* **mode**? : *[Mode](README.md#mode)*

* **platform**? : *"ios" | "android" | "web" | "electron"*

* **polyfill**? : *undefined | false | true*

* **production**? : *undefined | false | true*

* **projectRoot**? : *undefined | string*

* **pwa**? : *undefined | false | true*

* **removeUnusedImportExports**? : *undefined | false | true*

* **report**? : *undefined | object*

___

###  LoaderItemLoaderPart

Ƭ **LoaderItemLoaderPart**: *Pick‹[LoaderItem](interfaces/loaderitem.md), "loader" | "loaderIndex"›*

___

###  Mode

Ƭ **Mode**: *"production" | "development" | "none"*

___

###  PathResolver

Ƭ **PathResolver**: *function*

#### Type declaration:

▸ (...`input`: string[]): *string*

**Parameters:**

Name | Type |
------ | ------ |
`...input` | string[] |

___

###  Report

Ƭ **Report**: *object*

#### Type declaration:

* **path**: *string*

* **reportFilename**: *string*

* **statsFilename**: *string*

* **verbose**: *boolean*

___

###  ResolvedRuleSet

Ƭ **ResolvedRuleSet**: *string | RuleSetLoader*

___

###  SelectiveEnv

Ƭ **SelectiveEnv**: *Pick‹[Environment](README.md#environment), "locations" | "projectRoot" | "https"›*

## Variables

### `Const` environmentSchema

• **environmentSchema**: *ObjectSchema‹Object›* = yup.object({
  config: yup.object().notRequired(),
  locations: yup.object().notRequired(),
  info: yup.boolean().default(false),
  https: yup.boolean().default(false),
  polyfill: yup.boolean().notRequired(),
  removeUnusedImportExports: yup.boolean().default(false),
  pwa: yup.boolean().notRequired(),
  projectRoot: yup.string().required(),
  mode: yup
    .mixed<'production' | 'development' | 'none'>()
    .oneOf(['production', 'development', 'none']),
  platform: yup
    .mixed<'ios' | 'android' | 'web' | 'electron'>()
    .oneOf(['ios', 'android', 'web', 'electron'])
    .default('web'),
})

___

### `Const` excludedRootPaths

• **excludedRootPaths**: *string[]* = [
  'node_modules',
  'bower_components',
  '.expo',
  // Prevent transpiling webpack generated files.
  '(webpack)',
]

___

### `Const` host

• **host**: *string* = process.env.HOST || '0.0.0.0'

___

### `Const` includeModulesThatContainPaths

• **includeModulesThatContainPaths**: *string[]* = [
  getModule('react-native'),
  getModule('react-navigation'),
  getModule('expo'),
  getModule('unimodules'),
  getModule('@react'),
  getModule('@expo'),
  getModule('@unimodules'),
  getModule('native-base'),
]

___

### `Const` parsedPackageNames

• **parsedPackageNames**: *string[]* = []

___

### `Const` reportSchema

• **reportSchema**: *ObjectSchema‹Object›* = yup.object({
  verbose: yup.boolean().default(DEFAULT_REPORT.verbose),
  path: yup.string().default(DEFAULT_REPORT.path),
  statsFilename: yup.string().default(DEFAULT_REPORT.statsFilename),
  reportFilename: yup.string().default(DEFAULT_REPORT.reportFilename),
})

___

### `Let` warned

• **warned**: *object*

#### Type declaration:

* \[ **key**: *string*\]: boolean

## addons Functions

###  withAlias

▸ **withAlias**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `alias`: object): *[AnyConfiguration](README.md#anyconfiguration)*

Inject the required aliases for using React Native web and the extended Expo web ecosystem. Optionally can also safely append aliases to a Webpack config.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | - | Existing Webpack config to modify. |
`alias` | object | {} | Extra aliases to inject |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withCompression

▸ **withCompression**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `env`: Pick‹[Environment](README.md#environment), "projectRoot" | "config" | "locations"›): *[AnyConfiguration](README.md#anyconfiguration)*

Add production compression options to the provided Webpack config.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | Existing Webpack config to modify. |
`env` | Pick‹[Environment](README.md#environment), "projectRoot" &#124; "config" &#124; "locations"› | Environment used for getting the Expo project config. |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withDevServer

▸ **withDevServer**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `env`: [SelectiveEnv](README.md#selectiveenv), `options`: [DevServerOptions](README.md#devserveroptions)): *[AnyConfiguration](README.md#anyconfiguration)*

Add a valid dev server to the provided Webpack config.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | - | Existing Webpack config to modify. |
`env` | [SelectiveEnv](README.md#selectiveenv) | - | locations, projectRoot, and https options. |
`options` | [DevServerOptions](README.md#devserveroptions) | {} | Configure how the dev server is setup. |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withEntry

▸ **withEntry**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `env`: Pick‹[InputEnvironment](README.md#inputenvironment), "projectRoot" | "config" | "locations"›, `options`: object): *[AnyConfiguration](README.md#anyconfiguration)*

Inject a new entry path into an existing Webpack config.

**Parameters:**

▪ **webpackConfig**: *[AnyConfiguration](README.md#anyconfiguration)*

Existing Webpack config to modify.

▪`Default value`  **env**: *Pick‹[InputEnvironment](README.md#inputenvironment), "projectRoot" | "config" | "locations"›*= {}

Environment props used to get the Expo config.

▪ **options**: *object*

new entry path to inject.

Name | Type |
------ | ------ |
`entryPath` | string |
`strict?` | undefined &#124; false &#124; true |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withNodeMocks

▸ **withNodeMocks**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration)): *[AnyConfiguration](README.md#anyconfiguration)*

Some libraries import Node modules but don't use them in the browser.
Tell Webpack to provide empty mocks for them so importing them works.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | Existing Webpack config to modify. |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withOptimizations

▸ **withOptimizations**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration)): *[AnyConfiguration](README.md#anyconfiguration)*

Add the minifier and other optimizations for production builds.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | Existing Webpack config to modify. |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withReporting

▸ **withReporting**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `env`: [Environment](README.md#environment)): *[AnyConfiguration](README.md#anyconfiguration)*

Generate a bundle analysis and stats.json via the `webpack-bundle-analyzer` plugin.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | Existing Webpack config to modify. |
`env` | [Environment](README.md#environment) | Use the `report` prop to enable and configure reporting tools. |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withTypeScriptAsync

▸ **withTypeScriptAsync**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `env`: Pick‹[InputEnvironment](README.md#inputenvironment), "config" | "locations" | "projectRoot"›): *Promise‹[AnyConfiguration](README.md#anyconfiguration)›*

Enable or disable TypeScript in the Webpack config that's provided.
- Disabling will filter out any TypeScript extensions.
- Enabling will add fork TS checker to the plugins.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | - | input Webpack config to modify and return. |
`env` | Pick‹[InputEnvironment](README.md#inputenvironment), "config" &#124; "locations" &#124; "projectRoot"› | {} | Environment used to configure the input config. |

**Returns:** *Promise‹[AnyConfiguration](README.md#anyconfiguration)›*

___

###  withUnimodules

▸ **withUnimodules**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `env`: [InputEnvironment](README.md#inputenvironment), `argv`: [Arguments](interfaces/arguments.md)): *[AnyConfiguration](README.md#anyconfiguration)*

Wrap your existing webpack config with support for Unimodules.
ex: Storybook `({ config }) => withUnimodules(config)`

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | {} | Optional existing Webpack config to modify. |
`env` | [InputEnvironment](README.md#inputenvironment) | {} | Optional Environment options for configuring what features the Webpack config supports. |
`argv` | [Arguments](interfaces/arguments.md) | {} | - |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

###  withWorkbox

▸ **withWorkbox**(`webpackConfig`: [AnyConfiguration](README.md#anyconfiguration), `options`: OfflineOptions): *[AnyConfiguration](README.md#anyconfiguration)*

Add offline support to the provided Webpack config.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](README.md#anyconfiguration) | - | Existing Webpack config to modify. |
`options` | OfflineOptions | {} | configure the service worker. |

**Returns:** *[AnyConfiguration](README.md#anyconfiguration)*

___

## default Functions

###  createWebpackConfigAsync

▸ **createWebpackConfigAsync**(`env`: [InputEnvironment](README.md#inputenvironment), `argv`: [Arguments](interfaces/arguments.md)): *Promise‹Configuration | [DevConfiguration](interfaces/devconfiguration.md)›*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`env` | [InputEnvironment](README.md#inputenvironment) | - |
`argv` | [Arguments](interfaces/arguments.md) | {} |

**Returns:** *Promise‹Configuration | [DevConfiguration](interfaces/devconfiguration.md)›*

___

## env Functions

###  getAbsolute

▸ **getAbsolute**(`projectRoot`: string, ...`pathComponents`: string[]): *string*

get absolute path relative to project root while accounting for `https://` paths

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |
`...pathComponents` | string[] |

**Returns:** *string*

___

###  getConfig

▸ **getConfig**(`env`: Pick‹[Environment](README.md#environment), "projectRoot" | "config" | "locations"›): *ExpoConfig*

Get the Expo project config in a way that's optimized for web.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`env` | Pick‹[Environment](README.md#environment), "projectRoot" &#124; "config" &#124; "locations"› | Environment properties used for getting the Expo project config. |

**Returns:** *ExpoConfig*

___

###  getMode

▸ **getMode**(`__namedParameters`: object): *[Mode](README.md#mode)*

Resolve the `mode` in a way that accounts for legacy treatment and environment variables.

mode -> production -> development -> process.env.NODE_ENV -> 'development'

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`development` | undefined &#124; false &#124; true |
`mode` | undefined &#124; "development" &#124; "production" &#124; "none" |
`production` | undefined &#124; false &#124; true |

**Returns:** *[Mode](README.md#mode)*

___

###  getModuleFileExtensions

▸ **getModuleFileExtensions**(...`platforms`: string[]): *string[]*

Get the platform specific platform extensions in the format that Webpack expects (with a dot prefix).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`...platforms` | string[] | supported platforms in order of priority. ex: ios, android, web, native, electron, etc... |

**Returns:** *string[]*

___

###  getPaths

▸ **getPaths**(`projectRoot`: string): *[FilePaths](interfaces/filepaths.md)*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *[FilePaths](interfaces/filepaths.md)*

___

###  getPathsAsync

▸ **getPathsAsync**(`projectRoot`: string): *Promise‹[FilePaths](interfaces/filepaths.md)›*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *Promise‹[FilePaths](interfaces/filepaths.md)›*

___

###  getProductionPath

▸ **getProductionPath**(`projectRoot`: string): *string*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *string*

___

###  getPublicPaths

▸ **getPublicPaths**(`__namedParameters`: object): *object*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`env` | env |
`projectRoot` | string |

**Returns:** *object*

* **publicPath**: *string*

* **publicUrl**: *string*

___

###  getServedPath

▸ **getServedPath**(`projectRoot`: string): *string*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *string*

___

###  validateEnvironment

▸ **validateEnvironment**(`env`: [InputEnvironment](README.md#inputenvironment)): *[Environment](README.md#environment)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [InputEnvironment](README.md#inputenvironment) |

**Returns:** *[Environment](README.md#environment)*

___

###  validateReport

▸ **validateReport**(`report`: boolean | [Report](README.md#report)): *[Report](README.md#report) | null*

**Parameters:**

Name | Type |
------ | ------ |
`report` | boolean &#124; [Report](README.md#report) |

**Returns:** *[Report](README.md#report) | null*

___

## internal Functions

###  colorizeKeys

▸ **colorizeKeys**(`json`: object | string): *string*

**Parameters:**

Name | Type |
------ | ------ |
`json` | object &#124; string |

**Returns:** *string*

___

###  default

▸ **default**(`env`: [Environment](README.md#environment), `argv`: [Arguments](interfaces/arguments.md)): *Promise‹Configuration | [DevConfiguration](interfaces/devconfiguration.md)›*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`env` | [Environment](README.md#environment) | - |
`argv` | [Arguments](interfaces/arguments.md) | {} |

**Returns:** *Promise‹Configuration | [DevConfiguration](interfaces/devconfiguration.md)›*

___

###  ensureRoot

▸ **ensureRoot**(`possibleProjectRoot?`: undefined | string): *string*

**Parameters:**

Name | Type |
------ | ------ |
`possibleProjectRoot?` | undefined &#124; string |

**Returns:** *string*

___

###  generateCacheIdentifier

▸ **generateCacheIdentifier**(`projectRoot`: string, `version`: string): *string*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`projectRoot` | string | - |
`version` | string | "1" |

**Returns:** *string*

___

###  getDevtool

▸ **getDevtool**(`__namedParameters`: object, `__namedParameters`: object): *Options.Devtool*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`development` | boolean |
`production` | boolean |

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`devtool` | undefined &#124; false &#124; true &#124; "eval" &#124; "inline-source-map" &#124; "cheap-eval-source-map" &#124; "cheap-source-map" &#124; "cheap-module-eval-source-map" &#124; "cheap-module-source-map" &#124; "eval-source-map" &#124; "source-map" &#124; "nosources-source-map" &#124; "hidden-source-map" &#124; "inline-cheap-source-map" &#124; "inline-cheap-module-source-map" &#124; "@eval" &#124; "@inline-source-map" &#124; "@cheap-eval-source-map" &#124; "@cheap-source-map" &#124; "@cheap-module-eval-source-map" &#124; "@cheap-module-source-map" &#124; "@eval-source-map" &#124; "@source-map" &#124; "@nosources-source-map" &#124; "@hidden-source-map" &#124; "#eval" &#124; "#inline-source-map" &#124; "#cheap-eval-source-map" &#124; "#cheap-source-map" &#124; "#cheap-module-eval-source-map" &#124; "#cheap-module-source-map" &#124; "#eval-source-map" &#124; "#source-map" &#124; "#nosources-source-map" &#124; "#hidden-source-map" &#124; "#@eval" &#124; "#@inline-source-map" &#124; "#@cheap-eval-source-map" &#124; "#@cheap-source-map" &#124; "#@cheap-module-eval-source-map" &#124; "#@cheap-module-source-map" &#124; "#@eval-source-map" &#124; "#@source-map" &#124; "#@nosources-source-map" &#124; "#@hidden-source-map" |

**Returns:** *Options.Devtool*

___

### `Const` getModule

▸ **getModule**(`name`: string): *string*

**Parameters:**

Name | Type |
------ | ------ |
`name` | string |

**Returns:** *string*

___

###  getOutput

▸ **getOutput**(`locations`: [FilePaths](interfaces/filepaths.md), `mode`: [Mode](README.md#mode), `publicPath`: string): *Output*

**Parameters:**

Name | Type |
------ | ------ |
`locations` | [FilePaths](interfaces/filepaths.md) |
`mode` | [Mode](README.md#mode) |
`publicPath` | string |

**Returns:** *Output*

___

###  isFunction

▸ **isFunction**(`functionToCheck`: any): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`functionToCheck` | any |

**Returns:** *boolean*

___

###  isObject

▸ **isObject**(`val`: any): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`val` | any |

**Returns:** *boolean*

___

###  isValidMode

▸ **isValidMode**(`inputMode?`: undefined | string): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`inputMode?` | undefined &#124; string |

**Returns:** *boolean*

___

###  loaderToLoaderItemLoaderPart

▸ **loaderToLoaderItemLoaderPart**(`loader`: RuleSetUse | undefined): *Array‹[LoaderItemLoaderPart](README.md#loaderitemloaderpart)›*

**Parameters:**

Name | Type |
------ | ------ |
`loader` | RuleSetUse &#124; undefined |

**Returns:** *Array‹[LoaderItemLoaderPart](README.md#loaderitemloaderpart)›*

___

###  logAutoConfigValuesAsync

▸ **logAutoConfigValuesAsync**(`env`: [Environment](README.md#environment)): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](README.md#environment) |

**Returns:** *Promise‹void›*

___

###  logEnvironment

▸ **logEnvironment**(`__namedParameters`: object): *void*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`config` | object |
`env` | env |

**Returns:** *void*

___

###  logFooter

▸ **logFooter**(): *void*

**Returns:** *void*

___

###  logHeader

▸ **logHeader**(`title`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`title` | string |

**Returns:** *void*

___

###  logMdHelper

▸ **logMdHelper**(...`messages`: any[]): *void*

**Parameters:**

Name | Type |
------ | ------ |
`...messages` | any[] |

**Returns:** *void*

___

###  logPackage

▸ **logPackage**(`packageName`: string): *void*

**Parameters:**

Name | Type |
------ | ------ |
`packageName` | string |

**Returns:** *void*

___

###  logStaticsAsync

▸ **logStaticsAsync**(`env`: [Environment](README.md#environment)): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](README.md#environment) |

**Returns:** *Promise‹void›*

___

###  logWebpackConfigComponents

▸ **logWebpackConfigComponents**(`webpackConfig`: [DevConfiguration](interfaces/devconfiguration.md)): *void*

**Parameters:**

Name | Type |
------ | ------ |
`webpackConfig` | [DevConfiguration](interfaces/devconfiguration.md) |

**Returns:** *void*

___

###  packageNameFromPath

▸ **packageNameFromPath**(`inputPath`: string): *string | null*

**Parameters:**

Name | Type |
------ | ------ |
`inputPath` | string |

**Returns:** *string | null*

___

###  parsePaths

▸ **parsePaths**(`projectRoot`: string, `nativeAppManifest?`: ExpoConfig): *[FilePaths](interfaces/filepaths.md)*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |
`nativeAppManifest?` | ExpoConfig |

**Returns:** *[FilePaths](interfaces/filepaths.md)*

___

###  setDeepValue

▸ **setDeepValue**(`pathComponents`: string[], `object`: object, `value`: any): *void*

**Parameters:**

Name | Type |
------ | ------ |
`pathComponents` | string[] |
`object` | object |
`value` | any |

**Returns:** *void*

___

###  shouldWarnDeprecated

▸ **shouldWarnDeprecated**(`config`: object, `key`: string, `warnOnce`: boolean): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`config` | object |
`key` | string |
`warnOnce` | boolean |

**Returns:** *boolean*

___

###  testBabelPreset

▸ **testBabelPreset**(`locations`: [FilePaths](interfaces/filepaths.md)): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`locations` | [FilePaths](interfaces/filepaths.md) |

**Returns:** *Promise‹void›*

___

## loaders Functions

###  createAllLoaders

▸ **createAllLoaders**(`env`: [Environment](README.md#environment)): *Rule[]*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](README.md#environment) |

**Returns:** *Rule[]*

___

###  createBabelLoader

▸ **createBabelLoader**(`__namedParameters`: object): *Rule*

A complex babel loader which uses the project's `babel.config.js`
to resolve all of the Unimodules which are shipped as ES modules (early 2019).

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`babelProjectRoot` | undefined &#124; string | - | - |
`include` | string[] | [] | - |
`mode` | undefined &#124; "development" &#124; "production" &#124; "none" | - | The webpack mode: `"production" | "development"` |
`options` | options | - | - |
`platform` | any | - | - |
`useCustom` | undefined &#124; false &#124; true | - | - |
`verbose` | undefined &#124; false &#124; true | - | - |

**Returns:** *Rule*

___

###  createFontLoader

▸ **createFontLoader**(`projectRoot`: string, `includeModule`: function): *Rule*

**Parameters:**

▪ **projectRoot**: *string*

▪ **includeModule**: *function*

▸ (...`props`: string[]): *string*

**Parameters:**

Name | Type |
------ | ------ |
`...props` | string[] |

**Returns:** *Rule*

___

###  getAllLoaderRules

▸ **getAllLoaderRules**(`config`: ExpoConfig, `mode`: [Mode](README.md#mode), `__namedParameters`: object, `platform`: string): *Rule[]*

**Parameters:**

▪ **config**: *ExpoConfig*

▪ **mode**: *[Mode](README.md#mode)*

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`includeModule` | function |
`root` | string |
`template` | [FilePathsFolder](interfaces/filepathsfolder.md) |

▪`Default value`  **platform**: *string*= "web"

**Returns:** *Rule[]*

___

###  getBabelLoaderRule

▸ **getBabelLoaderRule**(`projectRoot`: string, `__namedParameters`: object, `mode`: [Mode](README.md#mode), `platform`: string): *Rule*

**Parameters:**

▪ **projectRoot**: *string*

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`web` | object |

▪ **mode**: *[Mode](README.md#mode)*

▪`Default value`  **platform**: *string*= "web"

**Returns:** *Rule*

___

###  getBabelLoaderRuleFromEnv

▸ **getBabelLoaderRuleFromEnv**(`env`: [Environment](README.md#environment)): *Rule*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](README.md#environment) |

**Returns:** *Rule*

___

###  getHtmlLoaderRule

▸ **getHtmlLoaderRule**(`exclude`: string): *Rule*

**Parameters:**

Name | Type |
------ | ------ |
`exclude` | string |

**Returns:** *Rule*

___

## utils Functions

###  conditionMatchesFile

▸ **conditionMatchesFile**(`condition`: RuleSetCondition | undefined, `file`: string): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`condition` | RuleSetCondition &#124; undefined |
`file` | string |

**Returns:** *boolean*

___

###  enableWithPropertyOrConfig

▸ **enableWithPropertyOrConfig**(`prop`: any, `config`: boolean | object, `merge`: boolean): *any*

Given a config option that could evalutate to true, config, or null; return a config.
e.g.
`polyfill: true` returns the `config`
`polyfill: {}` returns `{}`

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`prop` | any | - |
`config` | boolean &#124; object | - |
`merge` | boolean | false |

**Returns:** *any*

___

###  findLoader

▸ **findLoader**(`loaderName`: string, `rules`: RuleSetRule[]): *RuleSetRule | null*

**Parameters:**

Name | Type |
------ | ------ |
`loaderName` | string |
`rules` | RuleSetRule[] |

**Returns:** *RuleSetRule | null*

___

###  getLoaders

▸ **getLoaders**(`config`: [AnyConfiguration](README.md#anyconfiguration)): *[LoaderItem](interfaces/loaderitem.md)[]*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](README.md#anyconfiguration) |

**Returns:** *[LoaderItem](interfaces/loaderitem.md)[]*

___

###  getLoadersFromRules

▸ **getLoadersFromRules**(`rules`: [RuleItem](interfaces/ruleitem.md)[]): *[LoaderItem](interfaces/loaderitem.md)[]*

**Parameters:**

Name | Type |
------ | ------ |
`rules` | [RuleItem](interfaces/ruleitem.md)[] |

**Returns:** *[LoaderItem](interfaces/loaderitem.md)[]*

___

###  getPlugins

▸ **getPlugins**(`__namedParameters`: object): *[PluginItem](interfaces/pluginitem.md)[]*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`plugins` | Plugin‹›[] | [] |

**Returns:** *[PluginItem](interfaces/pluginitem.md)[]*

___

###  getPluginsByName

▸ **getPluginsByName**(`config`: [AnyConfiguration](README.md#anyconfiguration), `name`: string): *[PluginItem](interfaces/pluginitem.md)[]*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](README.md#anyconfiguration) |
`name` | string |

**Returns:** *[PluginItem](interfaces/pluginitem.md)[]*

___

###  getRules

▸ **getRules**(`config`: [AnyConfiguration](README.md#anyconfiguration)): *[RuleItem](interfaces/ruleitem.md)[]*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](README.md#anyconfiguration) |

**Returns:** *[RuleItem](interfaces/ruleitem.md)[]*

___

###  getRulesAsItems

▸ **getRulesAsItems**(`rules`: RuleSetRule[]): *[RuleItem](interfaces/ruleitem.md)[]*

**Parameters:**

Name | Type |
------ | ------ |
`rules` | RuleSetRule[] |

**Returns:** *[RuleItem](interfaces/ruleitem.md)[]*

___

###  getRulesByMatchingFiles

▸ **getRulesByMatchingFiles**(`config`: [AnyConfiguration](README.md#anyconfiguration), `files`: string[]): *object*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](README.md#anyconfiguration) |
`files` | string[] |

**Returns:** *object*

* \[ **key**: *string*\]: [RuleItem](interfaces/ruleitem.md)[]

___

###  getRulesFromRules

▸ **getRulesFromRules**(`rules`: RuleSetRule[]): *RuleSetRule[]*

**Parameters:**

Name | Type |
------ | ------ |
`rules` | RuleSetRule[] |

**Returns:** *RuleSetRule[]*

___

###  isEntry

▸ **isEntry**(`arg`: any): *arg is Entry*

**Parameters:**

Name | Type |
------ | ------ |
`arg` | any |

**Returns:** *arg is Entry*

___

###  isRuleSetItem

▸ **isRuleSetItem**(`loader`: RuleSetUse): *loader is RuleSetUseItem*

**Parameters:**

Name | Type |
------ | ------ |
`loader` | RuleSetUse |

**Returns:** *loader is RuleSetUseItem*

___

###  isRuleSetLoader

▸ **isRuleSetLoader**(`loader`: RuleSetUse): *loader is RuleSetLoader*

**Parameters:**

Name | Type |
------ | ------ |
`loader` | RuleSetUse |

**Returns:** *loader is RuleSetLoader*

___

###  overrideWithPropertyOrConfig

▸ **overrideWithPropertyOrConfig**(`prop`: any, `config`: boolean | object, `merge`: boolean): *any*

Used for features that are enabled by default unless specified otherwise.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`prop` | any | - |
`config` | boolean &#124; object | - |
`merge` | boolean | false |

**Returns:** *any*

___

###  resolveEntryAsync

▸ **resolveEntryAsync**(`arg`: any): *Promise‹Entry›*

**Parameters:**

Name | Type |
------ | ------ |
`arg` | any |

**Returns:** *Promise‹Entry›*

___

###  resolveRuleSetUse

▸ **resolveRuleSetUse**(`rule?`: RuleSetUse | RuleSetUse[]): *[ResolvedRuleSet](README.md#resolvedruleset)[]*

**Parameters:**

Name | Type |
------ | ------ |
`rule?` | RuleSetUse &#124; RuleSetUse[] |

**Returns:** *[ResolvedRuleSet](README.md#resolvedruleset)[]*

___

###  rulesMatchAnyFiles

▸ **rulesMatchAnyFiles**(`config`: [AnyConfiguration](README.md#anyconfiguration), `files`: string[]): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](README.md#anyconfiguration) |
`files` | string[] |

**Returns:** *boolean*

## internal Object literals

### `Const` DEFAULT_MINIFY

### ▪ **DEFAULT_MINIFY**: *object*

###  collapseWhitespace

• **collapseWhitespace**: *boolean* = true

###  keepClosingSlash

• **keepClosingSlash**: *boolean* = true

###  minifyCSS

• **minifyCSS**: *boolean* = true

###  minifyJS

• **minifyJS**: *boolean* = true

###  minifyURLs

• **minifyURLs**: *boolean* = true

###  removeComments

• **removeComments**: *boolean* = true

###  removeEmptyAttributes

• **removeEmptyAttributes**: *boolean* = true

###  removeRedundantAttributes

• **removeRedundantAttributes**: *boolean* = true

###  removeStyleLinkTypeAttributes

• **removeStyleLinkTypeAttributes**: *boolean* = true

###  useShortDoctype

• **useShortDoctype**: *boolean* = true

___

### `Const` DEFAULT_REPORT

### ▪ **DEFAULT_REPORT**: *object*

###  path

• **path**: *string* = "web-report"

###  reportFilename

• **reportFilename**: *string* = "report.html"

###  statsFilename

• **statsFilename**: *string* = "stats.json"

###  verbose

• **verbose**: *boolean* = false

___

### `Const` defaultGenerateSWOptions

### ▪ **defaultGenerateSWOptions**: *object*

###  clientsClaim

• **clientsClaim**: *true* = true

###  navigateFallbackBlacklist

• **navigateFallbackBlacklist**: *RegExp‹›[]* = [
    // Exclude URLs starting with /_, as they're likely an API call
    new RegExp('^/_'),
    // Exclude URLs containing a dot, as they're likely a resource in
    // public/ and not a SPA route
    new RegExp('/[^/]+\\.[^/]+$'),
  ]

###  runtimeCaching

• **runtimeCaching**: *object[]* = [runtimeCache]

###  skipWaiting

• **skipWaiting**: *true* = true

___

### `Const` defaultInjectManifestOptions

### ▪ **defaultInjectManifestOptions**: *object*

###  exclude

• **exclude**: *RegExp‹›[]* = [
    /\.LICENSE$/,
    /\.map$/,
    /asset-manifest\.json$/,
    // Exclude all apple touch images because they're cached locally after the PWA is added.
    // /^\bapple.*\.png$/,
  ]

___

### `Const` runtimeCache

### ▪ **runtimeCache**: *object*

###  handler

• **handler**: *string* = "networkFirst"

###  urlPattern

• **urlPattern**: *RegExp‹›* = /^https?.*/

▪ **options**: *object*

* **cacheName**: *string* = "offlineCache"

* **expiration**: *object*

  * **maxEntries**: *number* = 200

___

## loaders Object literals

### `Const` fallbackLoaderRule

### ▪ **fallbackLoaderRule**: *object*

"file" loader makes sure those assets get served by WebpackDevServer.
When you `import` an asset, you get its (virtual) filename.
In production, they would get copied to the `build` folder.
This loader doesn't use a "test" so it will catch all modules
that fall through the other loaders.

###  exclude

• **exclude**: *RegExp‹›[]* = [/\.(mjs|[jt]sx?)$/, /\.html$/, /\.json$/]

###  loader

• **loader**: *string* = require.resolve('file-loader')

▪ **options**: *object*

* **name**: *string* = "static/media/[name].[hash:8].[ext]"

___

### `Const` imageLoaderRule

### ▪ **imageLoaderRule**: *object*

This is needed for webpack to import static images in JavaScript files.
"url" loader works like "file" loader except that it embeds assets
smaller than specified limit in bytes as data URLs to avoid requests.
A missing `test` is equivalent to a match.

###  test

• **test**: *RegExp‹›* = /\.(gif|jpe?g|png|svg)$/

▪ **use**: *object*

* **loader**: *string* = require.resolve('url-loader')

* **options**: *object*

  * **limit**: *number* = 1000

  * **name**: *string* = "static/media/[name].[hash:8].[ext]"

___

### `Const` styleLoaderRule

### ▪ **styleLoaderRule**: *object*

###  test

• **test**: *RegExp‹›* = /\.(css)$/

###  use

• **use**: *string[]* = [require.resolve('style-loader'), require.resolve('css-loader')]
