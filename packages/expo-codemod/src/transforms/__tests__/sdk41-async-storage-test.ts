import { defineInlineTest } from 'jscodeshift/dist/testUtils';

import transform from '../sdk41-async-storage';

defineInlineTest(
  transform,
  {},
  `import AsyncStorage from '@react-native-community/async-storage';`,
  `import AsyncStorage from '@react-native-async-storage/async-storage';`,
  'async storage default import'
);

defineInlineTest(
  transform,
  {},
  `import {default as ReactNativeAsyncStorage} from '@react-native-community/async-storage';`,
  `import {default as ReactNativeAsyncStorage} from '@react-native-async-storage/async-storage';`,
  'async storage named import'
);

defineInlineTest(
  transform,
  {},
  `import AsyncStorageMock from '@react-native-community/async-storage/jest/async-storage-mock';`,
  `import AsyncStorageMock from '@react-native-async-storage/async-storage/jest/async-storage-mock';`,
  'async storage mock import'
);

// XXX: This experimental syntax requires enabling the parser plugin: 'exportDefaultFrom'
// defineInlineTest(
//   transform,
//   {},
//   `export default from '@react-native-community/async-storage/jest/async-storage-mock';`,
//   `export default from '@react-native-async-storage/async-storage/jest/async-storage-mock';`,
//   'async storage mock export'
// );

defineInlineTest(
  transform,
  {},
  `jest.mock('@react-native-community/async-storage', () => mockAsyncStorage);`,
  `jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);`,
  'async storage mock define'
);
