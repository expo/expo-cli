/* @flow */

import { $$asyncIterator } from 'iterall';
import { makeExecutableSchema } from 'graphql-tools';
import {
  Android,
  Config,
  Exp,
  Logger,
  Simulator,
  Project,
  ProjectSettings,
  ProjectUtils,
  UrlUtils,
  UserSettings,
} from 'xdl';
import mergeAsyncIterators from '../asynciterators/mergeAsyncIterators';

// for prettier
const graphql = text => text;

const typeDefs = graphql`
  enum Platform {
    ANDROID
    IOS
  }

  enum HostType {
    lan
    localhost
    tunnel
  }

  type Project {
    id: ID!
    # Absolute path of the project directory.
    projectDir: String!
    # The URL where the Expo manifest is being served.
    manifestUrl: String
    # Settings specific to this project, e.g. URL settings.
    settings: ProjectSettings!
    # Project configuration from app.json.
    config: ProjectConfig
    # Things that can send messages
    sources: [Source]
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
    githubUrl: String
  }

  input ProjectConfigInput {
    name: String
    description: String
    slug: String
    githubUrl: String
  }

  type UserSettings {
    id: ID!
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

  enum LogLevel {
    DEBUG
    INFO
    WARN
    ERROR
  }

  interface Message {
    id: ID!
    msg: String!
    time: String!
    source: Source!
    level: LogLevel!
  }

  type Issue implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Issues!
    level: LogLevel!
  }

  type LogMessage implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: LogLevel!
  }

  type DeviceMessage implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Device!
    level: LogLevel!
  }

  type BuildProgress implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: LogLevel!
    progress: Int!
    duration: Int!
  }

  type BuildFinished implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: LogLevel!
    duration: Int!
  }

  type BuildError implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: LogLevel!
    error: String!
    duration: Int!
  }

  type PageInfo {
    lastCursor: String
  }

  type MessageConnection {
    count: Int!
    nodes: [Message!]
    pageInfo: PageInfo
  }

  enum MessagePayloadType {
    ADDED
    UPDATED
    DELETED
  }

  type MessageSubscriptionPayload {
    type: MessagePayloadType!
    node: Message!
  }

  type ProjectManagerLayout {
    id: ID!
    selected: Source
    sources: [Source]
  }

  input ProjectManagerLayoutInput {
    selected: ID
    sources: [ID!]
  }

  enum NetworkStatus {
    ONLINE
    OFFLINE
  }

  type ProcessInfo {
    networkStatus: NetworkStatus!
    isAndroidSimulatorSupported: Boolean
    isIosSimulatorSupported: Boolean
  }

  type Query {
    # The project this instance of the XDL server is serving.
    currentProject: Project!
    # Globally persisted user preferences.
    userSettings: UserSettings!
    # Layout of the sections in project manager
    projectManagerLayout: ProjectManagerLayout
    # Information about the current process
    processInfo: ProcessInfo
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
    # Update projectConfig
    setProjectConfig(input: ProjectConfigInput!): Project
    # Update the layout
    setProjectManagerLayout(input: ProjectManagerLayoutInput): ProjectManagerLayout
  }

  type Subscription {
    # TODO(freiksenet): per-project log
    messages(after: String): MessageSubscriptionPayload
  }
`;

const messageResolvers = {
  level(message) {
    if (message.level <= Logger.DEBUG) return 'DEBUG';
    if (message.level <= Logger.INFO) return 'INFO';
    if (message.level <= Logger.WARN) return 'WARN';
    return 'ERROR';
  },
};

const USER_SETTINGS_ID = 'UserSettings';
const PROJECT_MANAGER_LAYOUT_ID = 'ProjectManagerLayout';

const resolvers = {
  Message: {
    __resolveType(parent) {
      if (parent.tag === 'device') {
        return 'DeviceMessage';
      } else if (parent.issueId) {
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
    ...messageResolvers,
    id(issue) {
      return `Issue:${issue.id}`;
    },
    source(parent, args, context) {
      return context.getIssuesSource();
    },
  },
  LogMessage: {
    ...messageResolvers,
    source(parent, args, context) {
      return context.getProcessSource();
    },
  },
  BuildProgress: {
    ...messageResolvers,
    source(parent, args, context) {
      return context.getProcessSource();
    },
  },
  BuildFinished: {
    ...messageResolvers,
    source(parent, args, context) {
      return context.getProcessSource();
    },
  },
  BuildError: {
    ...messageResolvers,
    source(parent, args, context) {
      return context.getProcessSource();
    },
  },
  DeviceMessage: {
    ...messageResolvers,
    source(message) {
      return { id: message.deviceId, name: message.deviceName };
    },
  },
  Project: {
    id(project) {
      return Buffer.from(project.projectDir).toString('base64');
    },
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
    sources(project, args, context) {
      return context.getSources();
    },
    messages(source, args, context) {
      return context.getMessageConnection();
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
      return context.getIssues();
    },
  },
  Process: {
    messages(source, args, context) {
      return context.getMessageConnection(
        message => message.tag === 'metro' || message.tag === 'expo'
      );
    },
  },
  Device: {
    messages(source, args, context) {
      return context.getMessageConnection(
        message => message.tag === 'device' && message.deviceId === source.id
      );
    },
  },
  ProjectManagerLayout: {
    id() {
      return PROJECT_MANAGER_LAYOUT_ID;
    },
    selected(layout, args, context) {
      const sources = context.getSources();
      return sources.find(source => source.id === layout.selected);
    },
    sources(layout, args, context) {
      const sources = context.getSources();
      let layoutSources = layout.sources;
      if (!layoutSources) {
        return [];
      } else {
        return layoutSources.map(sourceId => sources.find(source => source.id === sourceId));
      }
    },
  },
  UserSettings: {
    id() {
      return USER_SETTINGS_ID;
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
    processInfo() {
      return {
        networkStatus: Config.offline ? 'OFFLINE' : 'ONLINE',
        isAndroidSimulatorSupported: Android.isPlatformSupported(),
        isIosSimulatorSupported: Simulator.isPlatformSupported(),
      };
    },
  },
  Mutation: {
    async openSimulator(parent, { platform }, context) {
      const currentProject = context.getCurrentProject();
      let result =
        platform === 'ANDROID'
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
    async setProjectConfig(parent, { input }, context) {
      const currentProject = context.getCurrentProject();
      const filteredInput = {
        ...input,
        githubUrl: input.githubUrl.match(/^https:\/\/github.com\//) ? input.githubUrl : undefined,
      };
      let { exp } = await ProjectUtils.writeConfigJsonAsync(
        currentProject.projectDir,
        filteredInput
      );
      return {
        ...currentProject,
        config: exp,
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
        let parsedCursor = null;
        if (after) {
          parsedCursor = parseInt(after, 10);
        }
        const issueIterator = context.getIssueIterator();
        const messageIterator = context.getMessageIterator(parsedCursor);
        const iterator = mergeAsyncIterators(issueIterator, messageIterator);
        return {
          async next() {
            const result = await iterator.next();
            const { done, value } = result;
            return {
              value: {
                messages: {
                  ...value,
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

export default makeExecutableSchema({ typeDefs, resolvers });
