[@expo/webpack-config](../README.md) › ["loaders/createAllLoaders"](_loaders_createallloaders_.md)

# Module: "loaders/createAllLoaders"

## Index

### loaders Functions

* [createAllLoaders](_loaders_createallloaders_.md#createallloaders)
* [getAllLoaderRules](_loaders_createallloaders_.md#getallloaderrules)
* [getBabelLoaderRule](_loaders_createallloaders_.md#getbabelloaderrule)
* [getBabelLoaderRuleFromEnv](_loaders_createallloaders_.md#getbabelloaderrulefromenv)
* [getHtmlLoaderRule](_loaders_createallloaders_.md#gethtmlloaderrule)

### loaders Object literals

* [fallbackLoaderRule](_loaders_createallloaders_.md#const-fallbackloaderrule)
* [imageLoaderRule](_loaders_createallloaders_.md#const-imageloaderrule)
* [styleLoaderRule](_loaders_createallloaders_.md#const-styleloaderrule)

## loaders Functions

###  createAllLoaders

▸ **createAllLoaders**(`env`: [Environment](_types_.md#environment)): *Rule[]*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:73](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L73)*

Create the fallback loader for parsing any unhandled file type.

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](_types_.md#environment) |

**Returns:** *Rule[]*

___

###  getAllLoaderRules

▸ **getAllLoaderRules**(`config`: ExpoConfig, `mode`: [Mode](_types_.md#mode), `__namedParameters`: object, `platform`: string): *Rule[]*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:147](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L147)*

**Parameters:**

▪ **config**: *ExpoConfig*

▪ **mode**: *[Mode](_types_.md#mode)*

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`includeModule` | function |
`root` | string |
`template` | [FilePathsFolder](../interfaces/_types_.filepathsfolder.md) |

▪`Default value`  **platform**: *string*= "web"

**Returns:** *Rule[]*

___

###  getBabelLoaderRule

▸ **getBabelLoaderRule**(`projectRoot`: string, `__namedParameters`: object, `mode`: [Mode](_types_.md#mode), `platform`: string): *Rule*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:106](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L106)*

**Parameters:**

▪ **projectRoot**: *string*

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`web` | object |

▪ **mode**: *[Mode](_types_.md#mode)*

▪`Default value`  **platform**: *string*= "web"

**Returns:** *Rule*

___

###  getBabelLoaderRuleFromEnv

▸ **getBabelLoaderRuleFromEnv**(`env`: [Environment](_types_.md#environment)): *Rule*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:88](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L88)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](_types_.md#environment) |

**Returns:** *Rule*

___

###  getHtmlLoaderRule

▸ **getHtmlLoaderRule**(`exclude`: string): *Rule*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:131](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L131)*

**Parameters:**

Name | Type |
------ | ------ |
`exclude` | string |

**Returns:** *Rule*

## loaders Object literals

### `Const` fallbackLoaderRule

### ▪ **fallbackLoaderRule**: *object*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:45](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L45)*

"file" loader makes sure those assets get served by WebpackDevServer.
When you `import` an asset, you get its (virtual) filename.
In production, they would get copied to the `build` folder.
This loader doesn't use a "test" so it will catch all modules
that fall through the other loaders.

###  exclude

• **exclude**: *RegExp‹›[]* = [/\.(mjs|[jt]sx?)$/, /\.html$/, /\.json$/]

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:53](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L53)*

###  loader

• **loader**: *string* = require.resolve('file-loader')

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:46](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L46)*

▪ **options**: *object*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:54](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L54)*

* **name**: *string* = "static/media/[name].[hash:8].[ext]"

___

### `Const` imageLoaderRule

### ▪ **imageLoaderRule**: *object*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:18](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L18)*

This is needed for webpack to import static images in JavaScript files.
"url" loader works like "file" loader except that it embeds assets
smaller than specified limit in bytes as data URLs to avoid requests.
A missing `test` is equivalent to a match.

###  test

• **test**: *RegExp‹›* = /\.(gif|jpe?g|png|svg)$/

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:19](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L19)*

▪ **use**: *object*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:20](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L20)*

* **loader**: *string* = require.resolve('url-loader')

* **options**: *object*

  * **limit**: *number* = 1000

  * **name**: *string* = "static/media/[name].[hash:8].[ext]"

___

### `Const` styleLoaderRule

### ▪ **styleLoaderRule**: *object*

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:62](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L62)*

###  test

• **test**: *RegExp‹›* = /\.(css)$/

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:63](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L63)*

###  use

• **use**: *string[]* = [require.resolve('style-loader'), require.resolve('css-loader')]

*Defined in [packages/webpack-config/src/loaders/createAllLoaders.ts:64](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createAllLoaders.ts#L64)*
