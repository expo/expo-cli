import fs from 'fs-extra';
import path from 'path';
import StateManager from '../StateManager';
import { insert } from '../string-helpers';

export default async function configureAppDelegate(iosProjectPath: string) {
  const appDelegateMPath = path.resolve(iosProjectPath, 'AppDelegate.m');
  const appDelegateSwiftPath = path.resolve(iosProjectPath, 'AppDelegate.swift');

  const isObjectiveC = await fs.pathExists(appDelegateMPath);
  const isSwift = !isObjectiveC && (await fs.pathExists(appDelegateSwiftPath));

  if (!isObjectiveC && !isSwift) {
    throw new Error(`Failed to find main 'AppDelegate' file.`);
  }

  const fileContent = await fs.readFile(
    isObjectiveC ? appDelegateMPath : appDelegateSwiftPath,
    'utf-8'
  );

  if (isSwift) {
    throw new Error('To be implemented');
  }

  const { state: newFileContent } = new StateManager<string, boolean>(fileContent)
    .applyAction(content => {
      const result = (isSwift
        ? /TODO/m
        : /EXUpdatesAppController.*=.*\[EXUpdatesAppController.+sharedInstance\]/m
      ).test(content);
      return [content, 'expoUpdatesPresent', result];
    })
    .applyAction((content, { expoUpdatesPresent }) => {
      const result =
        expoUpdatesPresent &&
        (isSwift
          ? /TODO/
          : /EXSplashScreenService.*=.*\[UMModuleRegistryProvider getSingletonModuleForClass:.*EXSplashScreenService class.*\n.*showSplashScreenFor:rootViewController/m
        ).test(content);
      return [content, 'splashScreenShowPresent', result];
    })
    .applyAction((content, { expoUpdatesPresent }) => {
      const result =
        expoUpdatesPresent &&
        (isSwift ? /TODO/ : /#import +<EXSplashScreen\/EXSplashScreenService.h>/m).test(content);
      return [content, 'splashScreenServiceImportPresent', result];
    })
    .applyAction((content, { expoUpdatesPresent }) => {
      const result =
        expoUpdatesPresent &&
        (isSwift ? /TODO/ : /#import +<UMCore\/UMModuleRegistryProvider.h>/m).test(content);
      return [content, 'umModuleRegistryImportPresent', result];
    })
    .applyAction(
      (
        content,
        { expoUpdatesPresent, splashScreenServiceImportPresent, umModuleRegistryImportPresent }
      ) => {
        if (!expoUpdatesPresent) {
          return [content, 'insertedImports', false];
        }
        const [succeeded, newContent] = insert(content, {
          insertContent: [
            !splashScreenServiceImportPresent &&
              '#import <EXSplashScreen/EXSplashScreenService.h>\n',
            !umModuleRegistryImportPresent && '#import <UMCore/UMModuleRegistryProvider.h>\n',
            (!splashScreenServiceImportPresent || !umModuleRegistryImportPresent) && '\n',
          ]
            .filter(n => !!n)
            .join(''),
          insertPattern: /(?=@interface AppDelegate)/m,
        });
        return [newContent, 'insertedImports', succeeded];
      }
    )
    .applyAction((content, { expoUpdatesPresent, splashScreenShowPresent }) => {
      if (expoUpdatesPresent && !splashScreenShowPresent) {
        if (isSwift) {
          // TODO
        } else {
          const rootViewControllerName = content.match(
            /(_|self.)window\.rootViewController = (\w+)/m
          )?.[2];
          if (rootViewControllerName) {
            const [succeeded, newContent] = insert(content, {
              insertPattern: /(?=\n.*(_|self.)window\.rootViewController =.*)/m,
              insertContent: `
  EXSplashScreenService *splashScreenService = (EXSplashScreenService *)[UMModuleRegistryProvider getSingletonModuleForClass:[EXSplashScreenService class]];
  [splashScreenService showSplashScreenFor:${rootViewControllerName}];
`,
            });
            return [newContent, 'insertedSplashScreenShow', succeeded];
          }
        }
      }
      return [content, 'insertedSplashScreenShow', false];
    });

  await fs.writeFile(isObjectiveC ? appDelegateMPath : appDelegateSwiftPath, newFileContent);
}
