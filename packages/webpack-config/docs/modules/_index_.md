[@expo/webpack-config](../README.md) › ["index"](_index_.md)

# Module: "index"

## Index

### default Functions

* [createWebpackConfigAsync](_index_.md#createwebpackconfigasync)

## default Functions

###  createWebpackConfigAsync

▸ **createWebpackConfigAsync**(`env`: [InputEnvironment](_types_.md#inputenvironment), `argv`: [Arguments](../interfaces/_types_.arguments.md)): *Promise‹Configuration | [DevConfiguration](../interfaces/_types_.devconfiguration.md)›*

*Defined in [packages/webpack-config/src/index.ts:16](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/index.ts#L16)*

Create the official Webpack config for loading Expo web apps.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`env` | [InputEnvironment](_types_.md#inputenvironment) | - | Environment props used to configure features. |
`argv` | [Arguments](../interfaces/_types_.arguments.md) | {} | - |

**Returns:** *Promise‹Configuration | [DevConfiguration](../interfaces/_types_.devconfiguration.md)›*
