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

*Defined in [packages/webpack-config/src/env/paths.ts:167](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/env/paths.ts#L167)*

get absolute path relative to project root while accounting for `https://` paths

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |
`...pathComponents` | string[] |

**Returns:** *string*

___

###  getPaths

▸ **getPaths**(`projectRoot`: string): *[FilePaths](../interfaces/_types_.filepaths.md)*

*Defined in [packages/webpack-config/src/env/paths.ts:81](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/env/paths.ts#L81)*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *[FilePaths](../interfaces/_types_.filepaths.md)*

___

###  getPathsAsync

▸ **getPathsAsync**(`projectRoot`: string): *Promise‹[FilePaths](../interfaces/_types_.filepaths.md)›*

*Defined in [packages/webpack-config/src/env/paths.ts:91](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/env/paths.ts#L91)*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *Promise‹[FilePaths](../interfaces/_types_.filepaths.md)›*

___

###  getProductionPath

▸ **getProductionPath**(`projectRoot`: string): *string*

*Defined in [packages/webpack-config/src/env/paths.ts:158](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/env/paths.ts#L158)*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *string*

___

###  getPublicPaths

▸ **getPublicPaths**(`__namedParameters`: object): *object*

*Defined in [packages/webpack-config/src/env/paths.ts:124](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/env/paths.ts#L124)*

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

*Defined in [packages/webpack-config/src/env/paths.ts:104](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/env/paths.ts#L104)*

**Parameters:**

Name | Type |
------ | ------ |
`projectRoot` | string |

**Returns:** *string*
