/* eslint-env node */

import { resolveEntryAsync } from '../../utils';
import withEntry from '../withEntry';

it(`Ignores a missing custom entry without strict mode`, async () => {
  const config = withEntry(
    {
      mode: 'production',
      entry: {
        app: [],
      },
    },
    {},
    { entryPath: 'foo' }
  );

  const entry = await resolveEntryAsync(config.entry);
  expect(entry.app.length).toBe(0);
});

it(`Throws when a custom entry is missing in strict mode`, async () => {
  expect(() =>
    withEntry(
      {
        mode: 'production',
        entry: {
          app: [],
        },
      },
      {},
      { entryPath: 'foo', strict: true }
    )
  ).toThrow(/The required app entry module: "foo" couldn't be found/);
});

it(`Adds a custom entry point when it can be found`, async () => {
  const Config = require('@expo/config');
  Config.projectHasModule = jest.fn(customPath => {
    return customPath;
  });
  const withEntry = require('../withEntry').default;

  const config = withEntry(
    {
      mode: 'production',
      entry: {
        app: ['bar'],
      },
    },
    {},
    { entryPath: 'foo', strict: true }
  );

  const entry = await resolveEntryAsync(config.entry);
  expect(entry.app.length).toBe(2);
  // Should add to the beginning
  expect(entry.app[0]).toBe('foo');
});

it(`Throws when app is missing from entry in strict mode`, async () => {
  const Config = require('@expo/config');
  Config.projectHasModule = jest.fn(customPath => {
    return customPath;
  });
  const withEntry = require('../withEntry').default;

  const config = withEntry(
    {
      mode: 'production',
      entry: {
        otherValue: ['bar'],
      },
    },
    {},
    { entryPath: 'foo', strict: true }
  );

  expect(resolveEntryAsync(config.entry)).rejects.toThrow(
    /Failed to include required app entry module: "foo" because the webpack entry object doesn't contain an `app` field/
  );
});
