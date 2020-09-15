import { AnalyticsClient } from '@expo/xdl';

const packageJSON = require('../../../../package.json');

const client = new AnalyticsClient();

client.setSegmentNodeKey(
  process.env.EXPO_LOCAL || process.env.EXPO_STAGING
    ? '9qenkcMBJllh4gXYSN4BfJjJNPT7PULm'
    : 'TbWjTSn84LrRhfVEAfS6PG1wQoSCUYGp'
);

client.setVersionName(packageJSON.version);

export default client;
