import Log from '@expo/bunyan';
import { Plugin } from 'esbuild';

export default function loggingPlugin(logger: Log) {
  const plugin: Plugin = {
    name: 'expoLogging',
    setup(build) {
      build.onStart(() => {
        logger.info(
          { tag: 'metro' },
          JSON.stringify({
            type: 'bundle_build_started',
            id: Date.now(),
          })
        );
      });

      build.onEnd((result: any) => {
        if (result.errors.length) {
          logger.info(
            { tag: 'metro' },
            JSON.stringify({
              type: 'bundle_build_failed',
              id: Date.now(),
            })
          );
        } else {
          logger.info(
            { tag: 'metro' },
            JSON.stringify({
              type: 'bundle_build_done',
              id: Date.now(),
            })
          );
        }
      });
    },
  };
  return plugin;
}
