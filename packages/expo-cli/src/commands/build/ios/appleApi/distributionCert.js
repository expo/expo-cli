import get from 'lodash/get';
import dateformat from 'dateformat';
import chalk from 'chalk';

import { runAction, travelingFastlane } from './fastlane';

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

const createManager = ({ appleId, appleIdPassword, team }) => ({
  async list() {
    const args = ['list', appleId, appleIdPassword, team.id, team.inHouse];
    const { certs } = await runAction(travelingFastlane.manageDistCerts, args);
    return certs;
  },
  async create() {
    try {
      const args = ['create', appleId, appleIdPassword, team.id, team.inHouse];
      return await runAction(travelingFastlane.manageDistCerts, args);
    } catch (err) {
      const resultString = get(err, 'rawDump.resultString');
      if (resultString && resultString.match(/Maximum number of certificates generated/)) {
        const error = new Error(APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR);
        error.code = 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR';
        throw error;
      }
      throw err;
    }
  },
  async revoke(ids) {
    const args = ['revoke', appleId, appleIdPassword, team.id, team.inHouse, ids.join(',')];
    await runAction(travelingFastlane.manageDistCerts, args);
  },
  format({ name, id, status, expires, created, ownerName }) {
    const expiresDate = _formatTimestamp(expires);
    const createdDate = _formatTimestamp(created);
    return `${name} (${status}) - ID: ${id} - expires: ${expiresDate} (created: ${createdDate}) - owner: ${ownerName}`;
  },
});

const _formatTimestamp = timestamp => dateformat(new Date(timestamp * 1000));

export default createManager;
