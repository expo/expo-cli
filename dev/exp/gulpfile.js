const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const rimraf = require('rimraf');

const paths = {
  source: 'src/**/*.js',
  build: 'build',
  sourceRoot: path.join(__dirname, 'src'),
  builtFiles: 'build/**/*.{js,map}',
  nextBuild: 'expo-cli/build',
};

const tasks = {
  babel() {
    return gulp
      .src(paths.source)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(sourcemaps.write('__sourcemaps__', { sourceRoot: paths.sourceRoot }))
      .pipe(gulp.dest(paths.build));
  },

  copy() {
    return gulp.src(paths.builtFiles).pipe(gulp.dest(paths.nextBuild));
  },

  watchBabel(done) {
    gulp.watch(paths.source, gulp.series([tasks.babel, tasks.copy]));
    done();
  },
};

gulp.task('build', gulp.series([tasks.babel, tasks.copy]));
gulp.task('watch', tasks.watchBabel);
gulp.task('clean', done => {
  rimraf(paths.build, done);
});

gulp.task('default', gulp.series('watch'));
