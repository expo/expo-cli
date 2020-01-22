
# Interface: Options

## Hierarchy

* **Options**

## Indexable

* \[ **option**: *string*\]: any

In addition to the options actually used by this plugin, you can use this hash to pass arbitrary data through
to your template.

## Index

### Properties

* [cache](expohtmlwebpackplugin.options.md#optional-cache)
* [chunks](expohtmlwebpackplugin.options.md#optional-chunks)
* [chunksSortMode](expohtmlwebpackplugin.options.md#optional-chunkssortmode)
* [excludeChunks](expohtmlwebpackplugin.options.md#optional-excludechunks)
* [favicon](expohtmlwebpackplugin.options.md#optional-favicon)
* [filename](expohtmlwebpackplugin.options.md#optional-filename)
* [hash](expohtmlwebpackplugin.options.md#optional-hash)
* [inject](expohtmlwebpackplugin.options.md#optional-inject)
* [meta](expohtmlwebpackplugin.options.md#optional-meta)
* [minify](expohtmlwebpackplugin.options.md#optional-minify)
* [showErrors](expohtmlwebpackplugin.options.md#optional-showerrors)
* [template](expohtmlwebpackplugin.options.md#optional-template)
* [templateContent](expohtmlwebpackplugin.options.md#optional-templatecontent)
* [templateParameters](expohtmlwebpackplugin.options.md#optional-templateparameters)
* [title](expohtmlwebpackplugin.options.md#optional-title)
* [xhtml](expohtmlwebpackplugin.options.md#optional-xhtml)

## Properties

### `Optional` cache

• **cache**? : *undefined | false | true*

Emit the file only if it was changed.
Default: `true`.

___

### `Optional` chunks

• **chunks**? : *"all" | string[]*

Allows you to add only some chunks (e.g. only the unit-test chunk).
Default: 'all'.

___

### `Optional` chunksSortMode

• **chunksSortMode**? : *"none" | "auto" | "dependency" | "manual" | function*

Allows to control how chunks should be sorted before they are included to the html.
Default: `'auto'`.

___

### `Optional` excludeChunks

• **excludeChunks**? : *string[]*

Allows you to skip some chunks (e.g. don't add the unit-test chunk).
Default: `[]`.

___

### `Optional` favicon

• **favicon**? : *false | string*

Adds the given favicon path to the output html.
Default: `false`.

___

### `Optional` filename

• **filename**? : *undefined | string*

The file to write the HTML to.
You can specify a subdirectory here too (eg: `assets/admin.html`).
Default: `'index.html'`.

___

### `Optional` hash

• **hash**? : *undefined | false | true*

If true then append a unique webpack compilation hash to all included scripts and CSS files.
This is useful for cache busting.
Default: `false`.

___

### `Optional` inject

• **inject**? : *"body" | "head" | boolean*

Inject all assets into the given template or templateContent.
When passing true or 'body' all javascript resources will be placed at the bottom of the body element.
'head' will place the scripts in the head element.
Default: `true`.

___

### `Optional` meta

• **meta**? : *false | object*

Allows to inject meta-tags, e.g. meta: `{viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}`.
Default: `{}`.

___

### `Optional` minify

• **minify**? : *false | [MinifyOptions](../classes/expohtmlwebpackplugin.md#static-minifyoptions)*

Pass a html-minifier options object to minify the output.
https://github.com/kangax/html-minifier#options-quick-reference
Default: `false`.

___

### `Optional` showErrors

• **showErrors**? : *undefined | false | true*

Errors details will be written into the HTML page.
Default: `true`.

___

### `Optional` template

• **template**? : *undefined | string*

The `webpack` require path to the template.

**`see`** https://github.com/jantimon/html-webpack-plugin/blob/master/docs/template-option.md

___

### `Optional` templateContent

• **templateContent**? : *false | string | Promise‹string›*

Allow to use a html string instead of reading from a file.
Default: `false`, meaning the `template` option should be used instead.

___

### `Optional` templateParameters

• **templateParameters**? : *false | function | object*

Allows to overwrite the parameters used in the template.

___

### `Optional` title

• **title**? : *undefined | string*

The title to use for the generated HTML document.
Default: `'Webpack App'`.

___

### `Optional` xhtml

• **xhtml**? : *undefined | false | true*

If true render the link tags as self-closing (XHTML compliant).
Default: `false`.
