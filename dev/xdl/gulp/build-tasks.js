import gulp from 'gulp';
import babel from 'gulp-babel';
import changed from 'gulp-changed';
import sourcemaps from 'gulp-sourcemaps';
import rimraf from 'rimraf';

const paths = {
  source: {
    js: 'src/**/*.js',
  },
  build: 'build',
};

let tasks = {
  babel() {
    return gulp.src(paths.source.js)
      .pipe(changed(paths.build))
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(sourcemaps.write('__sourcemaps__'))
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(paths.source.js, tasks.babel);
    done();
  },

  clean(done) {
    rimraf(paths.build, done);
  },
};

export default tasks;
