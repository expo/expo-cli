const gulp = require('gulp');
const shell = require('gulp-shell');

const buildTasks = require('./gulp/build-tasks');

const tasks = Object.assign({}, buildTasks);

gulp.task('build', gulp.parallel(tasks.babel, tasks.flow));
gulp.task('watch', gulp.series(tasks.flow, tasks.babel, tasks.watchBabel));
gulp.task('caches', tasks.caches);
gulp.task('clean', tasks.clean);

gulp.task(
  'publish',
  gulp.series(tasks.clean, tasks.flow, tasks.babel, tasks.caches, shell.task(['npm publish']))
);

gulp.task('default', gulp.series('watch'));
