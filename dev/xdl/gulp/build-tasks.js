import path from 'path';
import gulp from 'gulp';
import babel from 'gulp-babel';
import changed from 'gulp-changed';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';
import rimraf from 'rimraf';

const paths = {
  source: {
    js: 'src/**/*.js',
  },
  sourceRoot: path.join(__dirname, 'src'),
  build: 'build',
};

let tasks = {
  babel() {
    return gulp.src(paths.source.js)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(sourcemaps.write('__sourcemaps__', { sourceRoot: paths.sourceRoot }))
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

export default tasks;
