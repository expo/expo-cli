[@expo/webpack-config](../README.md) › ["plugins/ExpoHtmlWebpackPlugin"](../modules/_plugins_expohtmlwebpackplugin_.md) › [ExpoHtmlWebpackPlugin](../classes/_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md) › [Options](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md)

# Interface: Options

## Hierarchy

* **Options**

## Indexable

* \[ **option**: *string*\]: any

In addition to the options actually used by this plugin, you can use this hash to pass arbitrary data through
to your template.

## Index

### Properties

* [cache](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-cache)
* [chunks](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-chunks)
* [chunksSortMode](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-chunkssortmode)
* [excludeChunks](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-excludechunks)
* [favicon](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-favicon)
* [filename](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-filename)
* [hash](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-hash)
* [inject](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-inject)
* [meta](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-meta)
* [minify](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-minify)
* [showErrors](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-showerrors)
* [template](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-template)
* [templateContent](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-templatecontent)
* [templateParameters](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-templateparameters)
* [title](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-title)
* [xhtml](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md#optional-xhtml)

## Properties

### `Optional` cache

• **cache**? : *undefined | false | true*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:44

Emit the file only if it was changed.
Default: `true`.

___

### `Optional` chunks

• **chunks**? : *"all" | string[]*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:59

Allows you to add only some chunks (e.g. only the unit-test chunk).
Default: 'all'.

___

### `Optional` chunksSortMode

• **chunksSortMode**? : *"none" | "auto" | "dependency" | "manual" | function*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:49

Allows to control how chunks should be sorted before they are included to the html.
Default: `'auto'`.

___

### `Optional` excludeChunks

• **excludeChunks**? : *string[]*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:64

Allows you to skip some chunks (e.g. don't add the unit-test chunk).
Default: `[]`.

___

### `Optional` favicon

• **favicon**? : *false | string*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:69

Adds the given favicon path to the output html.
Default: `false`.

___

### `Optional` filename

• **filename**? : *undefined | string*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:75

The file to write the HTML to.
You can specify a subdirectory here too (eg: `assets/admin.html`).
Default: `'index.html'`.

___

### `Optional` hash

• **hash**? : *undefined | false | true*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:81

If true then append a unique webpack compilation hash to all included scripts and CSS files.
This is useful for cache busting.
Default: `false`.

___

### `Optional` inject

• **inject**? : *"body" | "head" | boolean*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:88

Inject all assets into the given template or templateContent.
When passing true or 'body' all javascript resources will be placed at the bottom of the body element.
'head' will place the scripts in the head element.
Default: `true`.

___

### `Optional` meta

• **meta**? : *false | object*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:93

Allows to inject meta-tags, e.g. meta: `{viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}`.
Default: `{}`.

___

### `Optional` minify

• **minify**? : *false | [MinifyOptions](../classes/_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#static-minifyoptions)*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:99

Pass a html-minifier options object to minify the output.
https://github.com/kangax/html-minifier#options-quick-reference
Default: `false`.

___

### `Optional` showErrors

• **showErrors**? : *undefined | false | true*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:104

Errors details will be written into the HTML page.
Default: `true`.

___

### `Optional` template

• **template**? : *undefined | string*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:109

The `webpack` require path to the template.

**`see`** https://github.com/jantimon/html-webpack-plugin/blob/master/docs/template-option.md

___

### `Optional` templateContent

• **templateContent**? : *false | string | Promise‹string›*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:114

Allow to use a html string instead of reading from a file.
Default: `false`, meaning the `template` option should be used instead.

___

### `Optional` templateParameters

• **templateParameters**? : *false | function | object*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:118

Allows to overwrite the parameters used in the template.

___

### `Optional` title

• **title**? : *undefined | string*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:126

The title to use for the generated HTML document.
Default: `'Webpack App'`.

___

### `Optional` xhtml

• **xhtml**? : *undefined | false | true*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:131

If true render the link tags as self-closing (XHTML compliant).
Default: `false`.
