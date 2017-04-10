const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const fs = require('fs');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const request = require('request');
const sourcemaps = require('gulp-sourcemaps');
const rimraf = require('rimraf');

const paths = {
  source: {
    js: 'src/**/*.js',
  },
  sourceRoot: path.join(__dirname, 'src'),
  build: 'build',
  caches: 'caches',
};

const tasks = {
  babel() {
    return gulp.src(paths.source.js)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(sourcemaps.init({
        identityMap: true,
      }))
      .pipe(babel())
      .pipe(sourcemaps.write('__sourcemaps__', { sourceRoot: '/xdl/src' }))
      .pipe(gulp.dest(paths.build));
  },

  flow() {
    return gulp.src(paths.source.js)
      .pipe(rename({ extname: '.js.flow' }))
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(paths.source.js, gulp.parallel(tasks.flow, tasks.babel));
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

      fs.writeFileSync(path.join(paths.caches, 'versions.json'), body, { encoding: 'utf8' });

      for (let version of Object.keys(response.sdkVersions)) {
        request(`https://exp.host/--/xdl-schema/${version}`, (error, result, body) => {
          if (error) {
            throw error;
          }

          JSON.parse(body);
          fs.writeFileSync(path.join(paths.caches, `schema-${version}.json`), body, { encoding: 'utf8' });
        });
      }

      done();
    });
  }
};

module.exports = tasks;
