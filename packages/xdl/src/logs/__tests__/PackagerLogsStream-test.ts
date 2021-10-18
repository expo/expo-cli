import PackagerLogsStream from '../PackagerLogsStream';

jest.mock('../../internal', () => {
  const internal = jest.requireActual('../../internal');

  return {
    ...internal,
    ProjectUtils: {
      attachLoggerStream: jest.fn(),
    },
  };
});

describe(PackagerLogsStream, () => {
  it(`formats a snippet error`, () => {
    const streamer = new PackagerLogsStream({
      getSnippetForError: jest.fn(() => {
        return '';
      }),
      updateLogs: jest.fn(),
    } as any);

    streamer._handleChunk({
      // @ts-ignore
      hostname: 'Evans-MacBook-Pro.local',
      pid: 86582,
      type: 'project',
      project: '/Users/evanbacon/Documents/GitHub/lab/rolo5',
      level: 30,
      tag: 'metro',
      msg: {
        error: {
          type: 'TransformError',
          lineNumber: 0,
          errors: [
            {
              description:
                "node_modules/react-native/Libraries/NewAppScreen/components/logo.png: Cannot read property 'length' of undefined",
              lineNumber: 0,
            },
          ],
          name: 'SyntaxError',
          message:
            "node_modules/react-native/Libraries/NewAppScreen/components/logo.png: Cannot read property 'length' of undefined",
          stack:
            "TypeError: Cannot read property 'length' of undefined\n" +
            '    at applyAssetDataPlugins (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro/src/Assets.js:182:25)\n' +
            '    at getAssetData (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro/src/Assets.js:178:16)\n' +
            '    at async Object.transform (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro-transform-worker/src/utils/assetTransformer.js:30:16)\n' +
            '    at async transformAsset (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro-transform-worker/src/index.js:371:18)\n' +
            '    at async Object.transform (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro-transform-worker/src/index.js:559:14)',
        },
        type: 'bundling_error',
      },
      time: new Date('2021-10-18T20:06:02.209Z'),
      id: 'd1809510-304e-11ec-9b2e-5d348245f90d',
      v: 0,
    });

    expect(streamer._getSnippetForError).toHaveBeenCalledWith({
      errors: [
        {
          description:
            "node_modules/react-native/Libraries/NewAppScreen/components/logo.png: Cannot read property 'length' of undefined",
          lineNumber: 0,
        },
      ],
      lineNumber: 0,
      message:
        "node_modules/react-native/Libraries/NewAppScreen/components/logo.png: Cannot read property 'length' of undefined",
      name: 'SyntaxError',
      stack: expect.stringMatching(/at applyAssetDataPlugins/),
      //    `TypeError: Cannot read property 'length' of undefined
      //              at applyAssetDataPlugins (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro/src/Assets.js:182:25)
      //              at getAssetData (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro/src/Assets.js:178:16)
      //              at async Object.transform (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro-transform-worker/src/utils/assetTransformer.js:30:16)
      //              at async transformAsset (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro-transform-worker/src/index.js:371:18)
      //              at async Object.transform (/Users/evanbacon/Documents/GitHub/lab/rolo5/node_modules/metro-transform-worker/src/index.js:559:14)`,
      type: 'TransformError',
    });

    expect(streamer._logsToAdd.length).toBe(1);
    // Since the message has formatting, use a snapshot to keep it in an expected format.
    expect(streamer._logsToAdd[0].msg).toMatchSnapshot();
    // Title is expected.
    expect(streamer._logsToAdd[0].msg).toMatch(
      /node_modules\/react-native\/Libraries\/NewAppScreen\/components\/logo.png: Cannot read property 'length' of undefined/
    );
    // Stack trace is added.
    expect(streamer._logsToAdd[0].msg).toMatch(
      /at applyAssetDataPlugins \(\/Users\/evanbacon\/Documents\/GitHub\/lab\/rolo5\/node_modules\/metro\/src\/Assets\.js:182:25\)/
    );
  });
});
