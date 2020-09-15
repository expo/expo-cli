# config-types

Types for the Expo config object `app.config.ts`.

## Usage

```ts
import { ExpoConfig } from '@expo/config-types';

export default (): ExpoConfig => {
  return {
    name: 'My App',
    slug: 'my-app',
  };
};
```

## Contributing

This package is 100% generated using the versioned JSON schemas from the Expo server.

- `yarn generate` - uses the major version from the `package.json`.
- `yarn generate --path ../../../universe/server/www/xdl-schemas/UNVERSIONED-schema.json` - uses the latest version from your local directory.
- `yarn generate 39` - uses the given version.
- `yarn generate unversioned` - uses the latest version.
