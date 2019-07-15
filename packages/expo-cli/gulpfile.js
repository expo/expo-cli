'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');

const packageJSON = require('./package.json');

const paths = {
  source: {
    js: 'src/**/*.js',
    ts: 'src/**/*.ts',
  },
  build: 'build',
};

const tasks = {
  babel() {
    return gulp
      .src([paths.source.js, paths.source.ts])
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
    gulp.watch([paths.source.js, paths.source.ts], tasks.babel);
    done();
  },
};

gulp.task('build', tasks.babel);
gulp.task('watch', gulp.series(tasks.babel, tasks.watchBabel));
gulp.task('default', gulp.series('watch'));
