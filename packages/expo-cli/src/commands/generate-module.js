import generateModuleAsync from './generate-module/generateModuleAsync';

export default program => {
  program
    .command('generate-module [new-module-project-directory]')
    .alias('gm')
    .option(
      '-t, --template [type]',
      'Module type to be generated [universal]',
      /^(universal)$/i,
      'universal'
    )
    .option(
      '-td, --template-directory [localTemplateDirectory]',
      'Local directory containing module template'
    )
    .description('Generate a module from a template in [new-module-project-directory].')
    .asyncAction(generateModuleAsync);
};
