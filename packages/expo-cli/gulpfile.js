'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');

const packageJSON = require('expo-cli/package.json');

const paths = {
  source: {
    js: 'src/**/*.js',
    ts: 'src/**/*.ts',
  },
  build: 'build',
};

const tsconfig = require('./tsconfig.json');
const excluded = tsconfig.exclude.map(exclude => '!' + exclude);
const sourcePaths = Object.values(paths.source).concat(excluded);

const tasks = {
  babel() {
    return gulp
      .src(sourcePaths)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(
        sourcemaps.write('__sourcemaps__', {
          includeContent: false,
          sourceRoot: `/${packageJSON.name}@${packageJSON.version}/src`,
        })
      )
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(sourcePaths, tasks.babel);
    done();
  },
};

gulp.task('build', tasks.babel);
gulp.task('watch', gulp.series(tasks.babel, tasks.watchBabel));
gulp.task('default', gulp.series('watch'));
