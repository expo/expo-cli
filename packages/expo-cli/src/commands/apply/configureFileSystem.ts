import { ProjectFileSystem } from '@expo/config/build/Config.types';
import { getProjectName } from '@expo/config/build/ios/utils/Xcodeproj';
import fs from 'fs-extra';
import * as path from 'path';
import { XcodeProject } from 'xcode';

async function walkAsync(dir: string, shallow: boolean): Promise<string[]> {
  let results: string[] = [];
  const list = await fs.readdir(dir);

  // TODO: do-while?
  let pending = list.length;
  if (pending) {
    for (let file of list) {
      file = path.resolve(dir, file);
      const stat = await fs.stat(file);
      if (stat && stat.isDirectory()) {
        if (!shallow) {
          const res = await walkAsync(file, false);
          results = results.concat(res);
        }
        if (!--pending) {
          break;
        }
      } else {
        results.push(file);
        if (!--pending) {
          break;
        }
      }
    }
  }
  return results;
}

export async function getFileSystemIosAsync(projectRoot: string): Promise<ProjectFileSystem> {
  const iosPath = path.join(projectRoot, 'ios');
  const projectName = getProjectName(projectRoot);
  const iosProjectPath = path.join(iosPath, projectName);
  // TODO: Not this
  const iosXCProjectPath = path.join(iosPath, projectName + '.xcodeproj');
  let filePaths = await walkAsync(iosPath, true);
  filePaths = filePaths.concat(await walkAsync(iosProjectPath, false));
  filePaths = filePaths.concat(await walkAsync(iosXCProjectPath, false));
  return getFileSystemAsync(projectRoot, iosPath, filePaths);
}

export async function getFileSystemAndroidAsync(projectRoot: string): Promise<ProjectFileSystem> {
  const androidPath = path.join(projectRoot, 'android');
  let filePaths = await walkAsync(androidPath, true);
  filePaths = filePaths.concat(await walkAsync(path.join(androidPath, 'app'), true));
  filePaths = filePaths.concat(await walkAsync(path.join(androidPath, 'app/src/main'), false));

  return getFileSystemAsync(projectRoot, androidPath, filePaths);
}

async function getFileSystemAsync(
  projectRoot: string,
  platformProjectRoot: string,
  filePaths: string[]
): Promise<ProjectFileSystem> {
  const files: Record<string, any> = {};
  for (const filePath of filePaths) {
    // sandbox all native project files so android cannot access ios files and vise-versa.
    const key = path.relative(platformProjectRoot, filePath);
    files[key] = {
      _rewrite: false,
      _path: filePath,
      source() {
        return fs.readFileSync(this._path);
      },
    };
    // Object.defineProperty(files, key, {
    //   set() {
    //     return fs.readFileSync(filePath);
    //   },
    // });
    // Object.defineProperty(files, key, {
    //   get() {
    //     return fs.readFileSync(filePath);
    //   },
    // });
  }

  return {
    projectRoot,
    platformProjectRoot,
    pushFile(filePath: string, contents: Buffer | string) {
      console.log('append: ', filePath);
      files[filePath] = {
        _rewrite: true,
        _path: path.join(platformProjectRoot, filePath),
        source() {
          return contents;
        },
      };
    },
    files,
  };
}

export async function commitFilesAsync({ files }: Pick<ProjectFileSystem, 'files'>): Promise<void> {
  const commit = Object.values(files).filter(
    file => typeof file !== 'function' && file._rewrite !== false
  );
  console.log('Commit files to system: ', commit);

  await Promise.all(
    commit.map(file => {
      if (!file._path) {
        throw new Error(`Failed to commit files. No path defined for file: ${file}`);
      }
      fs.ensureDirSync(path.basename(file._path));
      fs.writeFile(file._path, file.source());
    })
  );
}
