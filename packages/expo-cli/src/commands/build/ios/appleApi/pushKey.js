import get from 'lodash/get';
import dateformat from 'dateformat';
import chalk from 'chalk';

import { runAction, travelingFastlane } from './fastlane';
import log from '../../../../log';

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Apple Keys generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

const createManager = ({ appleId, appleIdPassword, team }) => ({
  async list() {
    const args = ['list', appleId, appleIdPassword, team.id];
    const { keys } = await runAction(travelingFastlane.managePushKeys, args);
    return keys;
  },
  async create(metadata, name = `Expo Push Notifications Key ${dateformat('yyyymmddHHMMss')}`) {
    try {
      const args = ['create', appleId, appleIdPassword, team.id, name];
      return await runAction(travelingFastlane.managePushKeys, args);
    } catch (err) {
      const userString = get(err, 'rawDump.userString');
      if (userString && userString.match(/maximum allowed number of Keys/)) {
        log.error(APPLE_KEYS_TOO_MANY_GENERATED_ERROR);
      }
      throw err;
    }
  },
  async revoke(ids) {
    const args = ['revoke', appleId, appleIdPassword, team.id, ids.join(',')];
    await runAction(travelingFastlane.managePushKeys, args);
  },
  format({ id, name }) {
    return `${name} - ID: ${id}`;
  },
});

export default createManager;
