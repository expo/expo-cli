import 'instapromise';

import gulp from 'gulp';
import shell from 'gulp-shell';

import buildTasks from './gulp/build-tasks';

let tasks = {
  ...buildTasks,
};

gulp.task('build', gulp.parallel(tasks.babel, tasks.flow));
gulp.task('watch', gulp.series(tasks.flow, tasks.babel, tasks.watchBabel));
gulp.task('clean', tasks.clean);

gulp.task('publish', gulp.series(
  tasks.clean,
  tasks.flow,
  tasks.babel,
  shell.task(['npm publish'])
));

gulp.task('default', gulp.series('watch'));
