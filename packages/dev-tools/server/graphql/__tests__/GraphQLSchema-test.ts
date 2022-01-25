import { graphql, parse, subscribe } from 'graphql';

import AsyncIterableRingBuffer from '../AsyncIterableRingBuffer';
import schema from '../GraphQLSchema';
import Issues from '../Issues';
import createContext from '../createContext';

jest.mock('xdl');
jest.mock('@expo/dev-api');

const MOCK_LOGS = [
  {
    type: 'ADDED',
    sourceId: 'Source:metro',
    node: {
      name: 'expo',
      hostname: 'freiksenet-laptop',
      pid: 29613,
      type: 'project',
      project: '/home/freiksenet/Work/expo/test-project-1',
      level: 30,
      tag: 'metro',
      msg: 'Starting Metro Bundler on port 19003.',
      time: '2018-05-07T13:01:14.738Z',
      v: 0,
      _id: 3,
      id: 3,
    },
  },
  {
    type: 'ADDED',
    sourceId: 'ebe8cd5c-9aab-48e9-9d00-0ee0e9ec3710',
    node: {
      name: 'expo',
      hostname: 'example-laptop',
      pid: 31044,
      type: 'project',
      project: '/home/test/expo/test-project-1',
      level: 30,
      _id: '74accc01-a61d-461f-b55e-f98fb629422c:0',
      tag: 'device',
      deviceId: 'ebe8cd5c-9aab-48e9-9d00-0ee0e9ec3710',
      deviceName: 'Pixel',
      groupDepth: 0,
      shouldHide: undefined,
      includesStack: false,
      msg: 'Running application "main" with appParams:',
      time: '2018-05-07T13:07:59.594Z',
      v: 0,
      id: '74accc01-a61d-461f-b55e-f98fb629422c:0',
    },
  },
  {
    type: 'ADDED',
    sourceId: 'Source:metro',
    node: {
      name: 'expo',
      hostname: 'freiksenet-laptop',
      pid: 29613,
      type: 'project',
      project: '/home/freiksenet/Work/expo/test-project-1',
      level: 30,
      tag: 'metro',
      msg: 'Metro Bundler ready.',
      time: '2018-05-07T13:01:14.878Z',
      v: 0,
      _id: 4,
      id: 4,
      _metroEventType: 'METRO_INITIALIZE_STARTED',
    },
  },
  {
    type: 'ADDED',
    sourceId: 'Source:metro',
    node: {
      name: 'expo',
      hostname: 'freiksenet-laptop',
      pid: 29613,
      type: 'project',
      project: '/home/freiksenet/Work/expo/test-project-1',
      level: 30,
      tag: 'expo',
      msg: 'Tunnel connected.',
      time: '2018-05-07T13:01:16.117Z',
      v: 0,
      _id: 6,
      id: 6,
    },
  },
];

const MOCK_BUNDLE_LOGS = [
  {
    type: 'ADDED',
    sourceId: 'Source:metro',
    node: {
      name: 'expo',
      hostname: 'freiksenet-laptop',
      pid: 31044,
      type: 'project',
      project: '/home/freiksenet/Work/expo/test-project-1',
      level: 30,
      tag: 'metro',
      msg: 'Building JavaScript bundle',
      time: '2018-05-07T13:07:56.540Z',
      v: 0,
      _id: 7,
      id: 7,
      _metroEventType: 'BUILD_PROGRESS',
      progress: 0,
      duration: 0,
    },
  },
  {
    type: 'UPDATED',
    sourceId: 'Source:metro',
    node: {
      name: 'expo',
      hostname: 'freiksenet-laptop',
      pid: 31044,
      type: 'project',
      project: '/home/freiksenet/Work/expo/test-project-1',
      level: 30,
      tag: 'metro',
      msg: 'Building JavaScript bundle',
      time: '2018-05-07T13:07:56.540Z',
      v: 0,
      _id: 7,
      id: 7,
      _metroEventType: 'BUILD_PROGRESS',
      progress: 50,
      duration: 0,
    },
  },
];

const MOCK_ISSUE = {
  name: 'expo',
  hostname: 'freiksenet-laptop',
  pid: 17465,
  type: 'project',
  project: '/home/freiksenet/Work/expo/test-project-1',
  level: 40,
  tag: 'expo',
  issueId: 'fake-issue',
  msg: 'Warning: Fake error.',
  time: '2018-05-07T13:07:56.540Z',
  v: 0,
  id: 'fake-issue',
};

const fullQuery = `
query IndexPageQuery {
  currentProject {
    projectDir
    manifestUrl
    settings {
      hostType
    }
    config {
      name
      description
      slug
      platforms
    }
    sources {
      __typename
      id
      name
      messages {
        count
        nodes {
          id
          __typename
          msg
          time
        }
      }
    }
    messages {
      pageInfo {
        lastCursor
      }
    }
  }
  userSettings {
    sendTo
  }
  projectManagerLayout {
    __typename
    selected {
      id
    }
    sources {
      id
    }
  }
}`;

const messageQuery = `
query MessageQuery {
  currentProject {
    sources {
      messages {
        count
        nodes {
          id
          __typename
          msg
          time
          ... on BuildProgress {
            progress
          }
        }
      }
    }
  }
}
`;

const subscriptionQuery = parse(`
subscription MessageSubscription($after: String!) {
  messages(after: $after) {
    type
    node {
      id
      __typename
      msg
      time
      source {
        id
      }
      ... on BuildProgress {
        progress
      }
    }
  }
}
`);

let logBuffer;
let context;
let issues;
beforeEach(() => {
  logBuffer = new AsyncIterableRingBuffer();
  issues = new Issues();
  context = () =>
    createContext({
      projectDir: 'test-project-dir',
      messageBuffer: logBuffer,
      layout: {
        get() {
          return {
            selected: null,
            sources: null,
            sourceLastReads: {},
          };
        },
      },
      issues,
    });
});

test('full query', async () => {
  for (const log of MOCK_LOGS) {
    logBuffer.push(log);
  }
  issues.addIssue(MOCK_ISSUE.id, MOCK_ISSUE);
  const result = await graphql({ schema, source: fullQuery, contextValue: context() });
  expect(result).toMatchSnapshot();
});

test('message queries', async () => {
  for (const log of MOCK_LOGS.slice(0, 1)) {
    logBuffer.push(log);
  }

  let result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();

  for (const log of MOCK_LOGS.slice(1)) {
    logBuffer.push(log);
  }

  result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();

  logBuffer.push(MOCK_BUNDLE_LOGS[0]);

  result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();

  logBuffer.push(MOCK_BUNDLE_LOGS[1]);

  result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();

  issues.addIssue(MOCK_ISSUE.id, MOCK_ISSUE);

  result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();

  issues.addIssue(MOCK_ISSUE.id, MOCK_ISSUE);

  result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();

  issues.clearIssue(MOCK_ISSUE.id);

  result = await graphql({ schema, source: messageQuery, contextValue: context() });
  expect(result).toMatchSnapshot();
});

test('subscriptions', async () => {
  for (const log of MOCK_LOGS.slice(0, 1)) {
    logBuffer.push(log);
  }

  const queryResult = await graphql({ schema, source: fullQuery, contextValue: context() });
  expect(queryResult.errors).toBeUndefined();
  const cursor = queryResult.data.currentProject.messages.pageInfo.cursor;

  for (const log of MOCK_LOGS.slice(1)) {
    logBuffer.push(log);
  }

  const subscription = await subscribe({
    schema,
    document: subscriptionQuery,
    contextValue: context(),
    variableValues: { after: `${cursor}` },
  });

  issues.addIssue(MOCK_ISSUE.id, MOCK_ISSUE);

  logBuffer.push(MOCK_BUNDLE_LOGS[0]);
  logBuffer.push(MOCK_BUNDLE_LOGS[1]);

  issues.addIssue(MOCK_ISSUE.id, MOCK_ISSUE);

  issues.clearIssue(MOCK_ISSUE.id);
  issues.clearIssue('some-other-fake-id');

  const result = [];
  // Note that this expects 6 items. If there are less, then it will timeout
  // if there are more, then it won't get the ones after the first 6
  while (result.length < 9) {
    result.push((await subscription.next()).value);
  }

  expect(result).toMatchSnapshot();
});
