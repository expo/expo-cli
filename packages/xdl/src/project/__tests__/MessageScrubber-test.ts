import messageScrubber from '../MessageScrubber';

describe(messageScrubber.constructor.name, () => {
  it.each([
    [
      [`Compiled with warnings.`, `Attempted import error: 'InternMap' is not exported f`],
      [
        `/Users/someuser/Documents/someaccount.Application/frontend/node_modules/d3-scale/src/ordinal.js`,
      ],
      `[33mCompiled with warnings.[39m
            [33m[39m/Users/someuser/Documents/someaccount.Application/frontend/node_modules/d3-scale/src/ordinal.js
            Attempted import error: 'InternMap' is not exported f`,
    ],
    [
      [`Compiled with warnings.`, `Attempted import error: 'InternMap' is not exported f`],
      [`/Users/some user/Documents/@someaccount/src/thing.js`],
      `[33mCompiled with warnings.[39m
            [33m[39m/Users/some user/Documents/@someaccount/src/thing.js
            Attempted import error: 'InternMap' is not exported f`,
    ],
    [
      ['Compiled with warnings.', "Attempted import error: 'Animated' is not exported from"],
      ['./node_modules/react-native-maps/index.js', './lib/components/MapView'],
      `[33mCompiled with warnings.[39m
            [33m[39m./node_modules/react-native-maps/index.js
            Attempted import error: 'Animated' is not exported from './lib/components/MapView'.

            ./node_modules/react-native-m`,
    ],
    [
      ['Unable to resolve asset', 'from "splash.image" in your app.json or app.config.js'],
      ['./assets/something.png'],
      `Unable to resolve asset "./assets/something.png" from "splash.image" in your app.json or app.config.js`,
    ],
    [
      ['Unable to resolve asset', 'from "icon" in your app.json or app.config.js'],
      ['../app/brands/connect/assets/ASSET.png'],
      `Unable to resolve asset "../app/brands/connect/assets/ASSET.png" from "icon" in your app.json or app.config.js`,
    ],
    [
      ['Compiled with warnings.', "Attempted import error: 'ViewPropTypes' is not exported from"],
      [
        '/Users/somebody with spaces/in their/thing-native/node_modules/react-native-view-pdf/src/RNPDFView.js',
      ],
      `[33mCompiled with warnings.[39m
            [33m[39m/Users/somebody with spaces/in their/thing-native/node_modules/react-native-view-pdf/src/RNPDFView.js
            Attempted import error: 'ViewPropTypes' is not exported from`,
    ],
    [
      [`Warning: Problem validating app.json: Cannot find module '...' Require stack: - ... - ...`],
      [
        '/Users/a user with space/node_modules/xdl/build/project/Doctor.js',
        '/Users/auser/node_modules/xdl/build/internal.',
      ],
      `Warning: Problem validating app.json: Cannot find module '../logs/TerminalLink'
          Require stack:
          - /Users/a user/node_modules/xdl/build/project/Doctor.js
          - /Users/auser/node_modules/xdl/build/internal.`,
    ],
    [
      [
        'Warning: Problem validating app.json: Unable to perform cache refresh for ...: Error: Request failed with status code 404.',
      ],
      [`C:\\Users\\User\\AppData\\Local\\Expo\\schema-undefined.json`],
      `Warning: Problem validating app.json: Unable to perform cache refresh for C:\\Users\\User\\AppData\\Local\\Expo\\schema-undefined.json: Error: Request failed with status code 404.`,
    ],
    [
      [`Unable to resolve asset "..." from "icon" in your app.json or app.config.js`],
      ['@/assets/icon.png'],
      `Unable to resolve asset "@/assets/icon.png" from "icon" in your app.json or app.config.js`,
    ],
    [
      ['Error starting tunnel EPERM', 'operation not permitted, rename'],
      [
        'C:\\Users\\ASDoadfj90\\Desktop\\1440 Season\\Some Name\\athing\\mhm\\.expo\\packager-info.json.2224590387',
        'C:\\Users\\ASDoadfj91\\Deskto',
      ],
      `Error starting tunnel EPERM: operation not permitted, rename 'C:\\Users\\ASDoadfj90\\Desktop\\1440 Season\\Some Name\\athing\\mhm\\.expo\\packager-info.json.2224590387' -> 'C:\\Users\\ASDoadfj91\\Deskto`,
    ],
    [
      [
        `Compiled with warnings. ... Attempted import error: 'AppLoading' is not exported from 'expo'.`,
      ],
      [`C:/Some User/Some Folder/project/App.js`],
      `	
      [33mCompiled with warnings.[39m
      [33m[39mC:/Some User/Some Folder/project/App.js
      Attempted import error: 'AppLoading' is not exported from 'expo'.`,
    ],
  ])('scrubs system paths from incoming warnings', (retainedText, scrubbedText, rawMessage) => {
    const scrubbedMessage = messageScrubber.scrubMessage(rawMessage);
    retainedText.forEach(text => expect(scrubbedMessage).toContain(text));
    scrubbedText.forEach(text => expect(scrubbedMessage).not.toContain(text));
  });

  it.each([
    [
      ['This project belongs to', 'and you have not been granted the appropriate permissions'],
      ['@some_person23-xx'],
      `This project belongs to [1m@some_person23-xx[22m and you have not been granted the appropriate permissions.
              Please request access from an admin of @some_person23-xx or change the "owner" field to an account y`,
    ],
    [
      ['This project belongs to', 'and you have not been granted the appropriate permissions'],
      ['@yourbuddy'],
      `This project belongs to [1m@yourbuddy[22m and you have not been granted the appropriate permissions.
              Please request access from an admin of @yourbuddy or change the "owner" field to an account y`,
    ],
  ])('scrubs account names from incoming warnings', (retainedText, scrubbedText, rawMessage) => {
    const scrubbedMessage = messageScrubber.scrubMessage(rawMessage);
    retainedText.forEach(text => expect(scrubbedMessage).toContain(text));
    scrubbedText.forEach(text => expect(scrubbedMessage).not.toContain(text));
  });

  it.each([
    [
      [
        'Warning: You are using an old version of watchman (v20211206). It is recommend to always use the latest version, or at least v4.6.0. If you are using homebrew, try: brew uninstall watchman; brew ins',
      ],
      [],
      `Warning: You are using an old version of watchman (v20211206).

                It is recommend to always use the latest version, or at least v4.6.0.

                If you are using homebrew, try:
                brew uninstall watchman; brew ins`,
    ],
    [
      ['Tunnel URL not found (it might not be ready yet), falling back to LAN URL.'],
      [],
      `Tunnel URL not found (it might not be ready yet), falling back to LAN URL.`,
    ],
    [
      [
        'Warning: https://github.com/expo/react-native/archive/sdk-43.tar.gz is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.',
      ],
      [],
      `Warning: https://github.com/expo/react-native/archive/sdk-43.tar.gz is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.`,
    ],
  ])('does not alter generalized warnings', (retainedText, scrubbedText, rawMessage) => {
    const scrubbedMessage = messageScrubber.scrubMessage(rawMessage);
    retainedText.forEach(text => expect(scrubbedMessage).toContain(text));
    scrubbedText.forEach(text => expect(scrubbedMessage).not.toContain(text));
  });
});
