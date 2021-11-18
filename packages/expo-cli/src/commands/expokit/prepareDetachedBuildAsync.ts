import { Detach } from 'xdl';

type Options = {
  platform?: string;
  skipXcodeConfig: boolean;
};

export async function actionAsync(projectRoot: string, options: Options) {
  await Detach.prepareDetachedBuildAsync(projectRoot, options);
}
