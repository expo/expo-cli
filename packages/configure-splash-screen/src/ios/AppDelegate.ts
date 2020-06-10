import fs from 'fs-extra';
import path from 'path';
import StateManager from '../StateManager';
import { insert } from '../string-helpers';
import { IosProject } from './pbxproj';
import { getSwiftObjCBridgingHeaderFile } from '../xcode';

export default async function configureAppDelegate(iosProject: IosProject) {
  const { projectPath, pbxProject } = iosProject;
  const appDelegateMPath = path.resolve(projectPath, 'AppDelegate.m');
  const appDelegateSwiftPath = path.resolve(projectPath, 'AppDelegate.swift');

  const isObjectiveC = await fs.pathExists(appDelegateMPath);
  const isSwift = !isObjectiveC && (await fs.pathExists(appDelegateSwiftPath));

  if (!isObjectiveC && !isSwift) {
    throw new Error(`Failed to find main 'AppDelegate' file.`);
  }

  if (isSwift) {
    const swiftObjCBridgingHeaderFile = getSwiftObjCBridgingHeaderFile(pbxProject, {
      target: iosProject.applicationNativeTarget.uuid,
    });
    if (swiftObjCBridgingHeaderFile) {
      const bridgingHeaderContent = await fs.readFile(
        path.resolve(projectPath, '..', swiftObjCBridgingHeaderFile),
        'utf-8'
      );
      const { state: newBridgingHeaderContent } = new StateManager<string, boolean>(
        bridgingHeaderContent
      )
        .applyAction(content => {
          const matched = /#import <EXSplashScreen\/EXSplashScreenService\.h>/.test(content);
          return [content, 'importSplashScreenPresent', matched];
        })
        .applyAction(content => {
          const matched = /#import <EXUpdates\/EXUpdatesAppController\.h>/.test(content);
          return [content, 'importUpdatesPresent', matched];
        })
        .applyAction((content, { importSplashScreenPresent, importUpdatesPresent }) => {
          if (importSplashScreenPresent || !importUpdatesPresent) {
            return [content, 'insertedSplashScreenImport', false];
          }
          const [succeeded, newContent] = insert(content, {
            insertContent: '\n#import <EXSplashScreen/EXSplashScreenService.h>',
            insertPattern: /(?<=#import <EXUpdates\/EXUpdatesAppController\.h>)/,
          });
          return [newContent, 'insertedSplashScreenImport', succeeded];
        });
      await fs.writeFile(
        path.resolve(projectPath, '..', swiftObjCBridgingHeaderFile),
        newBridgingHeaderContent
      );
    }
  }

  const fileContent = await fs.readFile(
    isObjectiveC ? appDelegateMPath : appDelegateSwiftPath,
    'utf-8'
  );

  const { state: newFileContent } = new StateManager<string, boolean>(fileContent)
    .applyAction(content => {
      const result = (isSwift
        ? /EXUpdatesAppController.sharedInstance\(\)/
        : /EXUpdatesAppController.*=.*\[EXUpdatesAppController.+sharedInstance\]/m
      ).test(content);
      return [content, 'expoUpdatesPresent', result];
    })
    .applyAction((content, { expoUpdatesPresent }) => {
      const result =
        expoUpdatesPresent &&
        (isSwift
          ? /splashScreenService.showSplashScreen\(for:/
          : /EXSplashScreenService.*=.*\[UMModuleRegistryProvider getSingletonModuleForClass:.*EXSplashScreenService class.*\n.*showSplashScreenFor:rootViewController/m
        ).test(content);
      return [content, 'splashScreenShowPresent', result];
    })
    .applyAction((content, { expoUpdatesPresent }) => {
      if (isSwift) {
        return [content, 'splashScreenServiceImportPresent', false];
      }
      const result =
        expoUpdatesPresent && /#import +<EXSplashScreen\/EXSplashScreenService.h>/m.test(content);
      return [content, 'splashScreenServiceImportPresent', result];
    })
    .applyAction((content, { expoUpdatesPresent }) => {
      if (isSwift) {
        return [content, 'umModuleRegistryImportPresent', false];
      }
      const result =
        expoUpdatesPresent && /#import +<UMCore\/UMModuleRegistryProvider.h>/m.test(content);
      return [content, 'umModuleRegistryImportPresent', result];
    })
    .applyAction(
      (
        content,
        { expoUpdatesPresent, splashScreenServiceImportPresent, umModuleRegistryImportPresent }
      ) => {
        if (isSwift || !expoUpdatesPresent) {
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
          const rootViewControllerName = content.match(
            /window(\?)?.rootViewController = (\w+)/m
          )?.[2];
          if (rootViewControllerName) {
            const [succeeded, newContent] = insert(content, {
              insertPattern: /(?=\n.*(_|self.)?window(\?)?.rootViewController =.*)/m,
              insertContent: `
    let splashScreenService: EXSplashScreenService = UMModuleRegistryProvider.getSingletonModule(for: EXSplashScreenService) as! EXSplashScreenService
    splashScreenService.showSplashScreen(for: ${rootViewControllerName})
`,
            });
            return [newContent, 'insertedSplashScreenShow', succeeded];
          }
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
