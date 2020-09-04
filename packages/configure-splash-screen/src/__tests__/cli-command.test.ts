import configureAndroid from '../android';
import createCommand from '../cli-command';
import configureIos from '../ios';

jest.mock('../ios', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../android', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('cli-command', () => {
  describe('successful scenarios', () => {
    it('basic scenario', async () => {
      await createCommand().parseAsync(['--background-color', 'rgba(10, 20, 30, 0.2)'], {
        from: 'user',
      });
      expect(configureIos).toHaveBeenLastCalledWith(expect.anything(), {
        backgroundColor: 'rgba(10, 20, 30, 0.2)',
        darkMode: {
          backgroundColor: undefined,
          image: undefined,
        },
        image: undefined,
        imageResizeMode: undefined,
        statusBar: {
          hidden: undefined,
          style: undefined,
        },
      });
      expect(configureAndroid).toHaveBeenLastCalledWith(expect.anything(), {
        backgroundColor: 'rgba(10, 20, 30, 0.2)',
        darkMode: {
          backgroundColor: undefined,
          image: undefined,
          statusBar: {
            backgroundColor: undefined,
            style: undefined,
          },
        },
        image: undefined,
        imageResizeMode: undefined,
        statusBar: {
          hidden: undefined,
          style: undefined,
        },
      });
    });

    it('all available parameters', async () => {
      /* eslint-disable prettier/prettier */
      await createCommand().parseAsync(
        [
          '--background-color',
          'rgba(10, 20, 30, 0.2)',
          '--image-path',
          './assets/background.png',
          '--image-resize-mode',
          'contain',
          '--dark-mode-background-color',
          'yellow',
          '--dark-mode-image-path',
          './assets/background-dark.png',
          '--status-bar-style',
          'dark-content',
          '--status-bar-hidden',
          '--status-bar-translucent',
          '--status-bar-background-color',
          '#FFEECCDD',
          '--dark-mode-status-bar-background-color',
          'red',
          '--dark-mode-status-bar-style',
          'light-content',
        ],
        {
          from: 'user',
        }
      );
      /* eslint-enable */
      expect(configureIos).toHaveBeenLastCalledWith(expect.anything(), {
        backgroundColor: 'rgba(10, 20, 30, 0.2)',
        image: './assets/background.png',
        imageResizeMode: 'contain',
        darkMode: {
          backgroundColor: 'yellow',
          image: './assets/background-dark.png',
        },
        statusBar: {
          hidden: true,
          style: 'dark-content',
        },
      });
      expect(configureAndroid).toHaveBeenLastCalledWith(expect.anything(), {
        backgroundColor: 'rgba(10, 20, 30, 0.2)',
        image: './assets/background.png',
        imageResizeMode: 'contain',
        darkMode: {
          backgroundColor: 'yellow',
          image: './assets/background-dark.png',
          statusBar: {
            backgroundColor: 'red',
            style: 'light-content',
          },
        },
        statusBar: {
          backgroundColor: '#FFEECCDD',
          hidden: true,
          style: 'dark-content',
          translucent: true,
        },
      });
    });
  });

  describe('rejecting scenarios', () => {
    it('reject upon wrong platform', async () => {
      await expect(async () => {
        await createCommand().parseAsync(['--platform', 'what?'], { from: 'user' });
      }).rejects.toThrowError(
        new Error(
          `'platform': Invalid value 'what?'. Available values are "android" | "ios" | "all".`
        )
      );
    });

    it('reject upon missing backgroundColor', async () => {
      await expect(async () => {
        await createCommand().parseAsync(['--platform', 'all'], { from: 'user' });
      }).rejects.toThrowError(
        new Error(
          `'backgroundColor': Required option is not provided. Provide a valid color string.`
        )
      );
    });
  });
});
