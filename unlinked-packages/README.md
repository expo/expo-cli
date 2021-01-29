# unlinked-packages

Packages in this directory are published independently of other packages in the repository and should not be symlinked in development. They may be depended on by packages in `packages/` but should be consciously and carefully versioned. It's likely that libraries here should be moved somewhere else or need to be fundamentally re-designed, eg: configure-splash-screen lives here because it only supports one very specific version of expo-splash-screen at any given time, but it should probably support multiple versions of expo-splash-screen.

The publish script used for `packages` will not publish packages from this directory. They should be published manually when needed, and updates to other libraries that depend on them should be updated manually.
