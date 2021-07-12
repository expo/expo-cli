import type { Progress } from 'got';
import ProgressBar from 'progress';

type ProgressTracker = (progress: Progress) => void;

function createProgressTracker(_total?: number): ProgressTracker {
  let bar: ProgressBar | null = null;
  let transferredSoFar = 0;
  return (progress: Progress) => {
    if (!bar && (progress.total !== undefined || _total !== undefined)) {
      const total = (_total ?? progress.total) as number;
      bar = new ProgressBar('[:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        total,
        width: 64,
      });
    }
    if (bar) {
      bar.tick(progress.transferred - transferredSoFar);
    }
    transferredSoFar = progress.transferred;
  };
}

export { createProgressTracker };
