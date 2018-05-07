/* @flow */

import { $$asyncIterator } from 'iterall';
import { makeExecutableSchema } from 'graphql-tools';
import {
  Android,
  Exp,
  Simulator,
  Project,
  ProjectSettings,
  ProjectUtils,
  UrlUtils,
  UserSettings,
} from 'xdl';
import uniqBy from 'lodash/uniqBy';

// for prettier
const graphql = text => text;

const typeDefs = graphql`
  enum Platform {
    android
    ios
  }

  enum HostType {
    lan
    localhost
    tunnel
  }

  type Project {
    projectDir: String!
    # The URL where the Expo manifest is being served.
    manifestUrl: String
    # Settings specific to this project, e.g. URL settings.
    settings: ProjectSettings!
    # Project configuration from app.json.
    config: ProjectConfig
    # Things that can send messages
    sources: [Source!]
    # All messages from all sources
    messages: MessageConnection!
  }

  type ProjectSettings {
    hostType: HostType!
  }

  input ProjectSettingsInput {
    hostType: HostType
  }

  type ProjectConfig {
    name: String
    description: String
    slug: String
  }

  type UserSettings {
    sendTo: String
  }

  enum SendMedium {
    email
    sms
  }

  type SendProjectResult {
    medium: SendMedium!
    url: String!
  }

  type OpenProjectResult {
    url: String!
  }

  type PublishProjectResult {
    url: String!
  }

  interface Source {
    id: ID!
    name: String!
    messages: MessageConnection!
  }

  type Issues implements Source {
    id: ID!
    name: String!
    messages: MessageConnection!
  }

  type Process implements Source {
    id: ID!
    name: String!
    messages: MessageConnection!
  }

  type Device implements Source {
    id: ID!
    name: String!
    messages: MessageConnection!
  }

  interface Message {
    id: ID!
    msg: String!
    time: String!
    source: Source!
  }

  type Issue implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Issues!
  }

  type LogMessage implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: Int!
  }

  type DeviceMessage implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Device!
    level: Int!
  }

  type BuildProgress implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: Int!
    progress: Int!
    duration: Int!
  }

  type BuildFinished implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: Int!
    duration: Int!
  }

  type BuildError implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: Int!
    error: String!
    duration: Int!
  }

  type PageInfo {
    lastCursor: String
    hasNextPage: Boolean!
  }

  type MessageConnection {
    count: Int!
    nodes: [Message!]
    pageInfo: PageInfo
  }

  enum MessagePayloadType {
    ADDED
    UPDATED
  }

  type MessageSubscriptionPayload {
    type: MessagePayloadType!
    node: Message!
  }

  type ProjectManagerLayout {
    selected: Source
    sources: [Source!]
  }

  input ProjectManagerLayoutInput {
    selected: ID
    sources: [ID!]
  }

  type Query {
    # The project this instance of the XDL server is serving.
    currentProject: Project!
    # Globally persisted user preferences.
    userSettings: UserSettings!
    # Layout of the sections in project manager
    projectManagerLayout: ProjectManagerLayout
  }

  type Mutation {
    # Opens the app in an iOS simulator or and Android device/emulator.
    openSimulator(platform: Platform!): OpenProjectResult
    # Publishes the current project to expo.io
    publishProject(releaseChannel: String): PublishProjectResult
    # Sends the project URL by email or SMS.
    sendProjectUrl(recipient: String!): SendProjectResult
    # Updates specified project settings.
    setProjectSettings(settings: ProjectSettingsInput!): Project
    # Update the layout
    setProjectManagerLayout(input: ProjectManagerLayoutInput): ProjectManagerLayout
  }

  type Subscription {
    # TODO(freiksenet): per-project log
    messages(after: String): MessageSubscriptionPayload
  }
`;

const ISSUES_SOURCE = {
  __typename: 'Issues',
  id: 'issues',
  name: 'Critical Issues',
};
const PROCESS_SOURCE = {
  __typename: 'Process',
  id: 'metro',
  name: 'Metro Bundler',
};
const DEFAULT_SOURCES = [ISSUES_SOURCE, PROCESS_SOURCE];

const resolvers = {
  Message: {
    __resolveType(parent) {
      if (parent.tag === 'device') {
        return 'DeviceMessage';
      } else if (parent.tag === 'notifications') {
        return 'Issue';
      } else if (parent._bundleEventType) {
        switch (parent._bundleEventType) {
          case 'PROGRESS': {
            return 'BuildProgress';
          }
          case 'FINISHED': {
            return 'BuildFinished';
          }
          case 'FAILED': {
            return 'BuildError';
          }
        }
      }
      return 'LogMessage';
    },
  },
  Issue: {
    source() {
      return ISSUES_SOURCE;
    },
  },
  LogMessage: {
    source() {
      return PROCESS_SOURCE;
    },
  },
  BuildProgress: {
    source() {
      return PROCESS_SOURCE;
    },
  },
  BuildFinished: {
    source() {
      return PROCESS_SOURCE;
    },
  },
  BuildError: {
    source() {
      return PROCESS_SOURCE;
    },
  },
  DeviceMessage: {
    source(message) {
      return { id: message.deviceId, name: message.deviceName };
    },
  },
  Project: {
    manifestUrl(project) {
      return UrlUtils.constructManifestUrlAsync(project.projectDir);
    },
    settings(project) {
      return ProjectSettings.readAsync(project.projectDir);
    },
    async config(project) {
      let { exp } = await ProjectUtils.readConfigJsonAsync(project.projectDir);
      return exp;
    },
    sources(project) {
      return getSourcesFromBuffer(project.logBuffer);
    },
    messages(source, args, context) {
      const { logBuffer } = context.getCurrentProject();
      return connectionFromBuffer(logBuffer);
    },
  },
  ProjectSettings: {
    hostType(projectSettings) {
      return projectSettings.hostType;
    },
  },
  Source: {
    __resolveType(parent) {
      return parent.__typename;
    },
  },
  Issues: {
    messages(source, args, context) {
      return connectionFromBuffer(
        context.getCurrentProject().logBuffer,
        message => message.type === 'notifications'
      );
    },
  },
  Process: {
    messages(source, args, context) {
      return connectionFromBuffer(
        context.getCurrentProject().logBuffer,
        message => message.tag === 'metro' || message.tag === 'expo'
      );
    },
  },
  Device: {
    messages(source, args, context) {
      return connectionFromBuffer(
        context.getCurrentProject().logBuffer,
        message => message.tag === 'device' && message.deviceId === source.id
      );
    },
  },
  ProjectManagerLayout: {
    selected(layout, args, context) {
      const currentProject = context.getCurrentProject();
      const sources = getSourcesFromBuffer(currentProject.logBuffer);
      return sources.find(source => source.id === layout.selected);
    },
    sources(layout, args, context) {
      const currentProject = context.getCurrentProject();
      const sources = getSourcesFromBuffer(currentProject.logBuffer);
      let layoutSources = layout.sources;
      if (!layoutSources) {
        layoutSources = [sources.find(source => source.__typename !== 'Issues').id];
      }
      return layoutSources.map(sourceId => sources.find(source => source.id === sourceId));
    },
  },
  Query: {
    currentProject(parent, args, context) {
      return context.getCurrentProject();
    },
    userSettings() {
      return UserSettings.readAsync();
    },
    projectManagerLayout(parent, args, context) {
      return context.getProjectManagerLayout();
    },
  },
  Mutation: {
    async openSimulator(parent, { platform }, context) {
      const currentProject = context.getCurrentProject();
      let result =
        platform === 'android'
          ? await Android.openProjectAsync(currentProject.projectDir)
          : await Simulator.openProjectAsync(currentProject.projectDir);
      if (!result.success) throw new Error(result.error);
      else return { url: result.url };
    },
    publishProject(parent, { releaseChannel }, context) {
      const currentProject = context.getCurrentProject();
      return Project.publishAsync(currentProject.projectDir, { releaseChannel });
    },
    async setProjectSettings(parent, { settings }, context) {
      const currentProject = context.getCurrentProject();
      let updatedSettings = await ProjectSettings.setAsync(currentProject.projectDir, settings);
      return {
        ...currentProject,
        settings: updatedSettings,
      };
    },
    async sendProjectUrl(parent, { recipient }, context) {
      const currentProject = context.getCurrentProject();
      let url = await UrlUtils.constructManifestUrlAsync(currentProject.projectDir);
      let result = await Exp.sendAsync(recipient, url);
      await UserSettings.setAsync('sendTo', recipient);
      return { medium: result.medium, url };
    },
    setProjectManagerLayout(parent, { input }, context) {
      context.setProjectManagerLayout(input);
      return context.getProjectManagerLayout();
    },
  },
  Subscription: {
    messages: {
      subscribe(parent, { after }, context) {
        const currentProject = context.getCurrentProject();
        let parsedCursor = null;
        if (after) {
          parsedCursor = parseInt(after, 10);
        }
        const iterator = filterAsyncIterator(
          mergeAsyncIteratorMap({
            ADDED: currentProject.logBuffer.getPushIterator(parsedCursor),
            UPDATED: currentProject.logBuffer.getUpdateIterator(),
          }),
          item => true
        );
        return {
          async next() {
            const { done, value } = await iterator.next();
            return {
              value: {
                messages: {
                  type: value.key,
                  node: value.value,
                },
              },
              done,
            };
          },

          [$$asyncIterator]() {
            return this;
          },
        };
      },
    },
  },
};

function connectionFromBuffer(
  buffer: AsyncIterableRingBuffer,
  filter?: (chunk: any, cursor: number) => boolean
) {
  let cursor;
  let items;
  if (filter) {
    ({ cursor, items } = buffer.filterWithCursor(filter));
  } else {
    cursor = buffer.getLastCursor();
    items = buffer.all();
  }
  return {
    count: items.length,
    nodes: items,
    pageInfo: {
      hasNextPage: false,
      lastCursor: cursor,
    },
  };
}

function mergeAsyncIteratorMap(iterators: { [key: string]: Array<AsyncIterator> }): AsyncIterator {
  const dones = {};
  Object.keys(iterators).forEach(key => {
    dones[key] = false;
  });
  const promises = dones;

  return {
    async next() {
      Object.keys(iterators).forEach(key => {
        if (!promises[key] && !dones[key]) {
          promises[key] = iterators[key].next();
        }
      });

      const [key, result] = await Promise.race(
        Object.keys(promises).map(async key => [key, await promises[key]])
      );
      promises[key] = false;
      dones[key] = result.done;

      let done = false;
      if (Object.keys(dones).every(key => dones[key])) {
        done = true;
      }
      return {
        done,
        value: {
          key,
          value: result.value,
        },
      };
    },

    [$$asyncIterator]() {
      return this;
    },
  };
}

function filterAsyncIterator(
  iterator: AsyncIterator,
  filter: item => boolean | Promise<boolean>
): AsyncIterator {
  return {
    async next() {
      while (true) {
        const next = await iterator.next();
        if (await filter(next.value)) {
          return {
            done: next.done,
            value: next.value,
          };
        }
      }
    },

    [$$asyncIterator]() {
      return this;
    },
  };
}

function getSourcesFromBuffer(buffer) {
  const chunks = buffer.all().filter(chunk => chunk.tag === 'device');
  const devices = uniqBy(chunks, chunk => chunk.deviceId).map(chunk => ({
    __typename: 'Device',
    id: chunk.deviceId,
    name: chunk.deviceName,
  }));
  return DEFAULT_SOURCES.concat(devices);
}

export default makeExecutableSchema({ typeDefs, resolvers });
