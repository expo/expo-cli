import { runAction, travelingFastlane } from './fastlane';

const createManager = ({ appleId, appleIdPassword, team }) => ({
  async list() {
    const args = ['list', appleId, appleIdPassword, team.id];
    const { keys } = await runAction(travelingFastlane.managePushKeys, args);
    return keys;
  },
  async create(metadata, name = 'Expo Push Notifications Key') {
    const args = ['create', appleId, appleIdPassword, team.id, name];
    return await runAction(travelingFastlane.managePushKeys, args);
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
