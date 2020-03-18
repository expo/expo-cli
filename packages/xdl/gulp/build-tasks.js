const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const fs = require('fs');
const plumber = require('gulp-plumber');
const request = require('request');
const sourcemaps = require('gulp-sourcemaps');
const rimraf = require('rimraf');

const packageJson = require('@expo/xdl/package.json');

const paths = {
  source: {
    js: 'src/**/*.js',
    ts: 'src/**/*.ts',
  },
  build: 'build',
  caches: 'caches',
};

const tsconfig = require('../tsconfig.json');
const excluded = tsconfig.exclude.map(exclude => '!' + exclude);
const sourcePaths = Object.values(paths.source).concat(excluded);

const tasks = {
  babel() {
    return gulp
      .src(sourcePaths)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(
        sourcemaps.init({
          identityMap: true,
        })
      )
      .pipe(babel())
      .pipe(
        sourcemaps.write('__sourcemaps__', {
          sourceRoot: `/${packageJson.name}@${packageJson.version}/src`,
        })
      )
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(sourcePaths, tasks.babel);
    done();
  },

  clean(done) {
    rimraf(paths.build, done);
  },

  caches(done) {
    request('https://exp.host/--/versions', (error, result, body) => {
      if (error) {
        throw error;
      }

      // we don't need to do anything here, just let it throw if invalid json
      const response = JSON.parse(body);

      fs.writeFileSync(path.join(paths.caches, 'versions.json'), body, {
        encoding: 'utf8',
      });

      for (let version of Object.keys(response.sdkVersions)) {
        request(`https://exp.host/--/xdl-schema/${version}`, (error, result, body) => {
          if (error) {
            throw error;
          }

          JSON.parse(body);
          fs.writeFileSync(path.join(paths.caches, `schema-${version}.json`), body, {
            encoding: 'utf8',
          });
        });
      }

      done();
    });
  },
};

module.exports = tasks;
