import generateModuleAsync from './generate-module/generateModuleAsync';

export default program => {
  program
    .command('generate-module [new-module-project]')
    .option(
      '--template [dir]',
      'Local directory or npm package containing template for universal Expo module.'
    )
    .description(
      'Generate a universal module for Expo from a template in [new-module-project] directory.'
    )
    .asyncAction(generateModuleAsync);
};
