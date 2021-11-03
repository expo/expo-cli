/**
 * Assets work by fetching from the localhost using a filepath, example:
 * `./icon.png` would be fetched via `http://127.0.0.1:19000/assets/./icon.png`
 *
 * In the case of a monorepo, you may need to reach outside of the root folder:
 *
 * App running at `monorepo/apps/my-app/` would fetch a resource from `monorepo/node_modules/my-package/icon.png`
 * this would be done with `http://127.0.0.1:19000/assets/../../node_modules/my-package/icon.png`.
 *
 * The problem is that Metro dev server would collapse this URL into `http://127.0.0.1:19000/node_modules/my-package/icon.png` which is invalid.
 *
 * To combat this, we replace the `../` with a random character that cannot be collapsed: `@@/` (must be a character that can be encoded), then we add some dev server middleware to transform this back to `../` before fetching the asset.
 *
 */
function monorepoAssetsPlugin(assetData: { httpServerLocation: string }) {
  assetData.httpServerLocation = assetData.httpServerLocation.replace(/\.\.\//g, '@@/');
  return assetData;
}

// Export with `module.exports` for Metro asset plugin loading.
module.exports = monorepoAssetsPlugin;
