const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const rimraf = require('rimraf');

const paths = {
  source: {
    js: 'src/**/*.js',
  },
  sourceRoot: path.join(__dirname, 'src'),
  build: 'build',
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
};

module.exports = tasks;
