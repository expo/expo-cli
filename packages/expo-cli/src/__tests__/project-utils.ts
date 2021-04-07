import { User } from '@expo/api';

interface MockProject {
  projectRoot: string;
  projectTree: Record<string, string>;
  appJSON: AppJSON;
  packageJSON: PackageJSON;
}

interface PackageJSON {
  name: string;
  version: string;
  description: string;
  main: string;
}

interface AppJSON {
  expo: {
    name: string;
    version: string;
    slug: string;
    sdkVersion: string;
    owner: string;
    android?: {
      package: string;
    };
    [key: string]: object | string;
  };
}

function createTestProject(
  user: User,
  appJSONExtraData?: Record<string, object | string>
): MockProject {
  const projectRoot = '/test-project';
  const packageJSON: PackageJSON = {
    name: 'testing123',
    version: '0.1.0',
    description: 'fake description',
    main: 'index.js',
  };

  const appJSON: AppJSON = {
    expo: {
      name: 'testing 123',
      version: '0.1.0',
      slug: 'testing-123',
      sdkVersion: '33.0.0',
      owner: user.username,
      ...appJSONExtraData,
    },
  };
  return {
    appJSON,
    packageJSON,
    projectRoot,
    projectTree: {
      [projectRoot + '/package.json']: JSON.stringify(packageJSON, null, 2),
      [projectRoot + '/app.json']: JSON.stringify(appJSON, null, 2),
    },
  };
}

export { createTestProject };
