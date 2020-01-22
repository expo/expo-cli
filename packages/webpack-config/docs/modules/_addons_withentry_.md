[@expo/webpack-config](../README.md) › ["addons/withEntry"](_addons_withentry_.md)

# Module: "addons/withEntry"

## Index

### addons Functions

* [withEntry](_addons_withentry_.md#withentry)

## addons Functions

###  withEntry

▸ **withEntry**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `env`: Pick‹[InputEnvironment](_types_.md#inputenvironment), "projectRoot" | "config" | "locations"›, `options`: object): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withEntry.ts:16](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/addons/withEntry.ts#L16)*

Inject a new entry path into an existing Webpack config.

**Parameters:**

▪ **webpackConfig**: *[AnyConfiguration](_types_.md#anyconfiguration)*

Existing Webpack config to modify.

▪`Default value`  **env**: *Pick‹[InputEnvironment](_types_.md#inputenvironment), "projectRoot" | "config" | "locations"›*= {}

Environment props used to get the Expo config.

▪ **options**: *object*

new entry path to inject.

Name | Type |
------ | ------ |
`entryPath` | string |
`strict?` | undefined &#124; false &#124; true |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
