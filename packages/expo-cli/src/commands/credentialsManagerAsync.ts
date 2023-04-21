import Log from '../log';

type Options = {
  platform?: 'android' | 'ios';
  parent?: {
    nonInteractive: boolean;
  };
};

export async function actionAsync(_projectRoot: string, _options: Options) {
  Log.warn('expo credentials:manager no longer exists. Migrate to eas credentials.');
}
