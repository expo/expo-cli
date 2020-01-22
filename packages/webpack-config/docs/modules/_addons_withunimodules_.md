[@expo/webpack-config](../README.md) › ["addons/withUnimodules"](_addons_withunimodules_.md)

# Module: "addons/withUnimodules"

## Index

### addons Functions

* [withUnimodules](_addons_withunimodules_.md#withunimodules)

## addons Functions

###  withUnimodules

▸ **withUnimodules**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `env`: [InputEnvironment](_types_.md#inputenvironment), `argv`: [Arguments](../interfaces/_types_.arguments.md)): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withUnimodules.ts:30](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/addons/withUnimodules.ts#L30)*

Wrap your existing webpack config with support for Unimodules.
ex: Storybook `({ config }) => withUnimodules(config)`

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | {} | Optional existing Webpack config to modify. |
`env` | [InputEnvironment](_types_.md#inputenvironment) | {} | Optional Environment options for configuring what features the Webpack config supports. |
`argv` | [Arguments](../interfaces/_types_.arguments.md) | {} | - |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
