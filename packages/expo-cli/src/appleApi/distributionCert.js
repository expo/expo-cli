import dateformat from 'dateformat';

import { runAction, travelingFastlane } from './fastlane';

const createManager = ({ appleId, appleIdPassword, team }) => ({
  async list() {
    const args = ['list', appleId, appleIdPassword, team.id, team.inHouse];
    const { certs } = await runAction(travelingFastlane.manageDistCerts, args);
    return certs;
  },
  async create() {
    const args = ['create', appleId, appleIdPassword, team.id, team.inHouse];
    return await runAction(travelingFastlane.manageDistCerts, args);
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
