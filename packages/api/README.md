# @expo/api

A module for interacting with the expo.io API.

## About

### Settings

Implements different scoped settings:

- **UserSettings**: Global settings for use across projects.
- **ProjectSettings**: Directory level settings for use across tooling related to a project.
- **ProcessSettings**: In-memory settings for use during a node process.

### Analytics

This package exports the analytics API for other Expo dev tools.

```ts
import { Analytics, UnifiedAnalytics } from '@expo/api';
```

### API

The API is exported from modules that have typed input/outputs.

```ts
import {
  StandaloneBuild,
  Publish,
  Assets,
  Manifest,
  DevelopmentSessions,
  Sdks,
  Projects,
  SendProject,
  Auth,
  Versions,
} from '@expo/api';
```
