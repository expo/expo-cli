const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const rimraf = require('rimraf');

const package = require('./package.json');

const paths = {
  source: 'src/**/*.js',
  build: 'build',
};

const tasks = {
  babel() {
    return gulp
      .src(paths.source)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(
        sourcemaps.write('__sourcemaps__', {
          sourceRoot: `/${package.name}@${package.version}/src`,
        })
      )
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(paths.source, tasks.babel);
    done();
  },
};

gulp.task('build', tasks.babel);
gulp.task('watch', tasks.watchBabel);
gulp.task('clean', done => {
  rimraf(paths.build, done);
});

gulp.task('default', gulp.series('watch'));
