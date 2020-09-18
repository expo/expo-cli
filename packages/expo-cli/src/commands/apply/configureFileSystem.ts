import { PackModifierProps } from '@expo/config';
import { getProjectName } from '@expo/config/build/ios/utils/Xcodeproj';
import fs from 'fs-extra';
import * as path from 'path';

async function walkAsync(dir: string, shallow: boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    var results: any[] = [];
    fs.readdir(dir, function (err, list) {
      if (err) {
        return reject(err);
      }
      var pending = list.length;
      if (!pending) {
        return resolve(results);
      }
      list.forEach(function (file) {
        file = path.resolve(dir, file);
        fs.stat(file, async (err, stat) => {
          if (stat && stat.isDirectory()) {
            if (!shallow) {
              const res = await walkAsync(file, false);
              results = results.concat(res);
            }
            if (!--pending) {
              resolve(results);
            }
          } else {
            results.push(file);
            if (!--pending) {
              resolve(results);
            }
          }
        });
      });
    });
  });
}

export async function getFileSystemIosAsync(
  projectRoot: string
): Promise<PackModifierProps['files']> {
  const iosPath = path.join(projectRoot, 'ios');
  const projectName = getProjectName(projectRoot);
  const iosProjectPath = path.join(iosPath, projectName);
  // TODO: Not this
  const iosXCProjectPath = path.join(iosPath, projectName + '.xcodeproj');
  let filePaths = await walkAsync(iosPath, true);
  filePaths = filePaths.concat(await walkAsync(iosProjectPath, false));
  filePaths = filePaths.concat(await walkAsync(iosXCProjectPath, false));
  return getFileSystemAsync(iosPath, filePaths);
}

export async function getFileSystemAndroidAsync(
  projectRoot: string
): Promise<PackModifierProps['files']> {
  const androidPath = path.join(projectRoot, 'android');
  let filePaths = await walkAsync(androidPath, true);
  filePaths = filePaths.concat(await walkAsync(path.join(androidPath, 'app'), true));
  filePaths = filePaths.concat(await walkAsync(path.join(androidPath, 'app/src/main'), false));

  return getFileSystemAsync(androidPath, filePaths);
}

async function getFileSystemAsync(
  projectRoot: string,
  filePaths: string[]
): Promise<PackModifierProps['files']> {
  const files: Record<string, any> = {};
  for (const filePath of filePaths) {
    const key = '/' + path.relative(projectRoot, filePath);
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

  // All files start with slash so there will be no conflict.
  files.append = (filePath: string, contents: Buffer | string) => {
    console.log('append: ', filePath);
    files[filePath] = {
      _rewrite: true,
      _path: path.join(projectRoot, filePath),
      source() {
        return contents;
      },
    };
  };

  return files;
}

export async function commitFilesAsync(
  nativeProjectRoot: string,
  files: PackModifierProps['files']
): Promise<void> {
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
