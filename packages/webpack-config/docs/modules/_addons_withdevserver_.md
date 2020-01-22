[@expo/webpack-config](../README.md) › ["addons/withDevServer"](_addons_withdevserver_.md)

# Module: "addons/withDevServer"

## Index

### addons Functions

* [withDevServer](_addons_withdevserver_.md#withdevserver)

## addons Functions

###  withDevServer

▸ **withDevServer**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `env`: SelectiveEnv, `options`: DevServerOptions): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withDevServer.ts:41](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/addons/withDevServer.ts#L41)*

Add a valid dev server to the provided Webpack config.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | - | Existing Webpack config to modify. |
`env` | SelectiveEnv | - | locations, projectRoot, and https options. |
`options` | DevServerOptions | {} | Configure how the dev server is setup. |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
