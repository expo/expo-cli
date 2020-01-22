[@expo/webpack-config](../README.md) › ["addons/withAlias"](_addons_withalias_.md)

# Module: "addons/withAlias"

## Index

### addons Functions

* [withAlias](_addons_withalias_.md#withalias)

## addons Functions

###  withAlias

▸ **withAlias**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `alias`: object): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withAlias.ts:11](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/addons/withAlias.ts#L11)*

Inject the required aliases for using React Native web and the extended Expo web ecosystem. Optionally can also safely append aliases to a Webpack config.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | - | Existing Webpack config to modify. |
`alias` | object | {} | Extra aliases to inject |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
