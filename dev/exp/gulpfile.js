const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const rimraf = require('rimraf');

const paths = {
  source: 'src/**/*.js',
  build: 'build',
};

const tasks = {
  babel() {
    return gulp.src(paths.source)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(babel())
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(paths.source, tasks.babel);
    done();
  },
};

gulp.task('babel', tasks.babel);
gulp.task('build', tasks.babel);
gulp.task('watch', tasks.watchBabel);
gulp.task('clean', done => {
  rimraf(paths.build, done);
});
