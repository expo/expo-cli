import { vol } from 'memfs';

import { SilentError } from '../../../CommandError';
import { attemptAddingPluginsAsync } from '../modifyConfigAsync';

jest.mock('fs');

describe(attemptAddingPluginsAsync, () => {
  beforeEach(() => {
    vol.reset();
  });

  it('adds a new plugin without performing any filesystem validation', async () => {
    vol.fromJSON(
      {
        'app.json': JSON.stringify({ expo: {} }),
        'package.json': JSON.stringify({}),
      },
      '/'
    );

    await attemptAddingPluginsAsync('/', { plugins: ['foo-bar'] }, ['bacon']);

    expect(JSON.parse(vol.readFileSync('/app.json').toString())).toStrictEqual({
      expo: {
        plugins: ['foo-bar', 'bacon'],
      },
    });
  });

  it('does not add duplicates', async () => {
    vol.fromJSON(
      {
        'app.json': JSON.stringify({ expo: {} }),
        'package.json': JSON.stringify({}),
      },
      '/'
    );

    await attemptAddingPluginsAsync('/', { plugins: ['foo-bar', 'somn'] }, ['foo-bar']);

    expect(JSON.parse(vol.readFileSync('/app.json').toString())).toStrictEqual({
      expo: {
        plugins: [
          // Order is important! Changing the order would be a breaking change.
          'foo-bar',
          'somn',
        ],
      },
    });
  });

  it('fails when the app.json does not exist', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({}),
      },
      '/'
    );

    await expect(
      attemptAddingPluginsAsync('/', { plugins: ['foo-bar'] }, ['bacon'])
    ).rejects.toThrow(SilentError);
  });
});
