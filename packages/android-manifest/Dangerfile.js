import { schedule } from 'danger';
import { istanbulCoverage } from 'danger-plugin-istanbul-coverage';

schedule(istanbulCoverage());
