[@expo/webpack-config](../README.md) › ["addons/withTypeScriptAsync"](_addons_withtypescriptasync_.md)

# Module: "addons/withTypeScriptAsync"

## Index

### addons Functions

* [withTypeScriptAsync](_addons_withtypescriptasync_.md#withtypescriptasync)

## addons Functions

###  withTypeScriptAsync

▸ **withTypeScriptAsync**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration), `env`: Pick‹[InputEnvironment](_types_.md#inputenvironment), "config" | "locations" | "projectRoot"›): *Promise‹[AnyConfiguration](_types_.md#anyconfiguration)›*

*Defined in [packages/webpack-config/src/addons/withTypeScriptAsync.ts:18](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/addons/withTypeScriptAsync.ts#L18)*

Enable or disable TypeScript in the Webpack config that's provided.
- Disabling will filter out any TypeScript extensions.
- Enabling will add fork TS checker to the plugins.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | - | input Webpack config to modify and return. |
`env` | Pick‹[InputEnvironment](_types_.md#inputenvironment), "config" &#124; "locations" &#124; "projectRoot"› | {} | Environment used to configure the input config. |

**Returns:** *Promise‹[AnyConfiguration](_types_.md#anyconfiguration)›*
