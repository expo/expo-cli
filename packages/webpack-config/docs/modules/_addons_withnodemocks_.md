[@expo/webpack-config](../README.md) › ["addons/withNodeMocks"](_addons_withnodemocks_.md)

# Module: "addons/withNodeMocks"

## Index

### addons Functions

* [withNodeMocks](_addons_withnodemocks_.md#withnodemocks)

## addons Functions

###  withNodeMocks

▸ **withNodeMocks**(`webpackConfig`: [AnyConfiguration](_types_.md#anyconfiguration)): *[AnyConfiguration](_types_.md#anyconfiguration)*

*Defined in [packages/webpack-config/src/addons/withNodeMocks.ts:10](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/addons/withNodeMocks.ts#L10)*

Some libraries import Node modules but don't use them in the browser.
Tell Webpack to provide empty mocks for them so importing them works.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`webpackConfig` | [AnyConfiguration](_types_.md#anyconfiguration) | Existing Webpack config to modify. |

**Returns:** *[AnyConfiguration](_types_.md#anyconfiguration)*
