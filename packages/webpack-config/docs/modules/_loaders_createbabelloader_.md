[@expo/webpack-config](../README.md) › ["loaders/createBabelLoader"](_loaders_createbabelloader_.md)

# Module: "loaders/createBabelLoader"

## Index

### loaders Functions

* [createBabelLoader](_loaders_createbabelloader_.md#createbabelloader)

## loaders Functions

###  createBabelLoader

▸ **createBabelLoader**(`__namedParameters`: object): *Rule*

*Defined in [packages/webpack-config/src/loaders/createBabelLoader.ts:107](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createBabelLoader.ts#L107)*

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
