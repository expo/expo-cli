import type { User } from '@expo/api';

const jester: User = {
  kind: 'user',
  username: 'jester',
  nickname: 'jester',
  userId: 'jester-id',
  picture: 'jester-pic',
  userMetadata: { onboarded: true },
  currentConnection: 'Username-Password-Authentication',
  sessionSecret: 'jester-secret',
};

export { jester };
