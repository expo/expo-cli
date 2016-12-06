const gulp = require('gulp');
const shell = require('gulp-shell');

const buildTasks = require('./gulp/build-tasks');
const postinstallTasks = require('./gulp/postinstall-tasks');

const tasks = Object.assign({}, buildTasks, postinstallTasks);

gulp.task('build', gulp.parallel(tasks.babel, tasks.flow));
gulp.task('watch', gulp.series(tasks.flow, tasks.babel, tasks.watchBabel));
gulp.task('clean', tasks.clean);

gulp.task('publish', gulp.series(
  tasks.clean,
  tasks.flow,
  tasks.babel,
  shell.task(['npm publish'])
));

gulp.task('postinstall', tasks.postinstall);

gulp.task('default', gulp.series('watch'));
