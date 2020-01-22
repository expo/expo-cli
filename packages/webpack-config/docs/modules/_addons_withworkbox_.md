[@expo/webpack-config](../README.md) › ["addons/withWorkbox"](_addons_withworkbox_.md)

# Module: "addons/withWorkbox"

## Index

### addons Functions

* [withWorkbox](_addons_withworkbox_.md#withworkbox)

## addons Functions

###  withWorkbox

▸ **withWorkbox**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `options`: OfflineOptions): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withWorkbox.ts:75](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/addons/withWorkbox.ts#L75)*

Add offline support to the provided Webpack config.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | - | Existing Webpack config to modify. |
`options` | OfflineOptions | {} | configure the service worker. |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
