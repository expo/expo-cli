[@expo/webpack-config](../README.md) › ["env/paths"](_env_paths_.md)

# Module: "env/paths"

## Index

### env Functions

* [getAbsolute](_env_paths_.md#getabsolute)
* [getPaths](_env_paths_.md#getpaths)
* [getPathsAsync](_env_paths_.md#getpathsasync)
* [getProductionPath](_env_paths_.md#getproductionpath)
* [getPublicPaths](_env_paths_.md#getpublicpaths)
* [getServedPath](_env_paths_.md#getservedpath)

## env Functions

###  getAbsolute

▸ **getAbsolute**(`projectRoot`: string, ...`pathComponents`: string[]): *string*

*Defined in [packages/webpack-config/src/env/paths.ts:175](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/paths.ts#L175)*

Get an absolute path relative to the project root while accounting for remote paths (`https://`).

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |
`...pathComponents` | string[] |

**Returns:** *string*

___

###  getPaths

▸ **getPaths**(`projectRoot`: string): *[FilePaths](../interfaces/_types_.filepaths.md)*

*Defined in [packages/webpack-config/src/env/paths.ts:83](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/paths.ts#L83)*

Sync method for getting default paths used throughout the Webpack config.
This is useful for Next.js which doesn't support async Webpack configs.

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *[FilePaths](../interfaces/_types_.filepaths.md)*

___

###  getPathsAsync

▸ **getPathsAsync**(`projectRoot`: string): *Promise‹[FilePaths](../interfaces/_types_.filepaths.md)›*

*Defined in [packages/webpack-config/src/env/paths.ts:94](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/paths.ts#L94)*

Async method for getting default paths used throughout the Webpack config.

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *Promise‹[FilePaths](../interfaces/_types_.filepaths.md)›*

___

###  getProductionPath

▸ **getProductionPath**(`projectRoot`: string): *string*

*Defined in [packages/webpack-config/src/env/paths.ts:164](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/paths.ts#L164)*

Get the output folder path. Defaults to `web-build`.

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *string*

___

###  getPublicPaths

▸ **getPublicPaths**(`__namedParameters`: object): *object*

*Defined in [packages/webpack-config/src/env/paths.ts:129](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/paths.ts#L129)*

Get paths dictating where the app is served. In development mode this returns default values.

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

*Defined in [packages/webpack-config/src/env/paths.ts:108](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/paths.ts#L108)*

Get paths dictating where the app is served regardless of the current Webpack mode.

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *string*
