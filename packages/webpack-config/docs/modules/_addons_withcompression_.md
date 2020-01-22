[@expo/webpack-config](../README.md) › ["addons/withCompression"](_addons_withcompression_.md)

# Module: "addons/withCompression"

## Index

### addons Functions

* [withCompression](_addons_withcompression_.md#withcompression)

## addons Functions

###  withCompression

▸ **withCompression**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `env`: Pick‹[Environment](_types_.md#environment), "projectRoot" | "config" | "locations"›): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withCompression.ts:38](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/addons/withCompression.ts#L38)*

Add production compression options to the provided Webpack config.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | Existing Webpack config to modify. |
`env` | Pick‹[Environment](_types_.md#environment), "projectRoot" &#124; "config" &#124; "locations"› | Environment used for getting the Expo project config. |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
