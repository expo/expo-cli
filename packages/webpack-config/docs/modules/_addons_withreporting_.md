[@expo/webpack-config](../README.md) › ["addons/withReporting"](_addons_withreporting_.md)

# Module: "addons/withReporting"

## Index

### addons Functions

* [withReporting](_addons_withreporting_.md#withreporting)

## addons Functions

###  withReporting

▸ **withReporting**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `env`: [Environment](_types_.md#environment)): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withReporting.ts:62](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/addons/withReporting.ts#L62)*

Generate a bundle analysis and stats.json via the `webpack-bundle-analyzer` plugin.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | Existing Webpack config to modify. |
`env` | [Environment](_types_.md#environment) | Use the `report` prop to enable and configure reporting tools. |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
