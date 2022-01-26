import { getConfig, writeConfigJsonAsync } from '@expo/config';
import spawnAsync from '@expo/spawn-async';
import { makeExecutableSchema } from 'graphql-tools';
import { $$asyncIterator } from 'iterall';
import {
  Android,
  ConnectionStatus,
  Exp,
  Logger,
  Project,
  ProjectSettings,
  ProjectUtils,
  Simulator,
  UrlUtils,
  UserManager,
  UserSettings,
  Webpack,
} from 'xdl';

import mergeAsyncIterators from '../asynciterators/mergeAsyncIterators';

// for prettier
const graphql = <T>(text: T): T => text;

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

  type User {
    username: String
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
    dev: Boolean!
    minify: Boolean!
  }

  input ProjectSettingsInput {
    hostType: HostType
    dev: Boolean
    minify: Boolean
  }

  type ProjectConfig {
    name: String
    description: String
    slug: String
    githubUrl: String
    platforms: [String]
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

  union OpenSimulatorResult = OpenSimulatorSuccess | OpenSimulatorError

  type OpenSimulatorSuccess {
    url: String!
  }

  type OpenSimulatorError {
    error: String!
  }

  type OpenWebResult {
    error: String
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
    includesStack: Boolean
  }

  type MetroInitializeStarted implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
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

  type TunnelReady implements Message {
    id: ID!
    msg: String!
    time: String!
    source: Process!
    level: LogLevel!
  }

  type PageInfo {
    lastReadCursor: String
    lastCursor: String
  }

  type MessageConnection {
    count: Int!
    unreadCount: Int!
    nodes: [Message!]
    pageInfo: PageInfo
  }

  enum MessagePayloadType {
    ADDED
    UPDATED
    DELETED
  }

  union MessageSubscriptionPayload = MessagePayload | SourceClearedPayload

  type MessagePayload {
    type: MessagePayloadType!
    cursor: String
    node: Message!
  }

  type SourceClearedPayload {
    source: Source
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

  type ProcessInfo {
    isAndroidSimulatorSupported: Boolean
    isIosSimulatorSupported: Boolean
    webAppUrl: String
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
    # Current logged-in user
    user: User
  }

  type Mutation {
    # Opens the app in an iOS simulator or and Android device/emulator.
    openSimulator(platform: Platform!): OpenSimulatorResult
    # Starts WebPack server
    openWeb: OpenWebResult
    # Publishes the current project to expo.dev (classic updates)
    publishProject(releaseChannel: String): PublishProjectResult
    # Sends the project URL by email.
    sendProjectUrl(recipient: String!): SendProjectResult
    # Compresses the images in a project
    optimizeAssets: Project
    # Updates specified project settings.
    setProjectSettings(settings: ProjectSettingsInput!): Project
    # Update projectConfig
    setProjectConfig(input: ProjectConfigInput!): Project
    # Update the layout
    setProjectManagerLayout(input: ProjectManagerLayoutInput): ProjectManagerLayout
    # Update a last read status for a source
    updateLastRead(sourceId: ID!, lastReadCursor: String!): Source
    # Clear a log from a source
    clearMessages(sourceId: ID!): Source
  }

  type Subscription {
    # TODO(freiksenet): per-project log
    messages(after: String): MessageSubscriptionPayload
  }
`;

const messageResolvers = {
  level(message: { level: number }): string {
    if (message.level <= Logger.DEBUG) return 'DEBUG';
    if (message.level <= Logger.INFO) return 'INFO';
    if (message.level <= Logger.WARN) return 'WARN';
    return 'ERROR';
  },
};

const USER_SETTINGS_ID = 'UserSettings';
const PROJECT_MANAGER_LAYOUT_ID = 'ProjectManagerLayout';

const resolvers = {
  OpenSimulatorResult: {
    __resolveType(result) {
      if (result.success) {
        return 'OpenSimulatorSuccess';
      } else {
        return 'OpenSimulatorError';
      }
    },
  },
  Message: {
    __resolveType(message) {
      if (message.tag === 'device') {
        return 'DeviceMessage';
      } else if (message.issueId) {
        return 'Issue';
      } else if (message._metroEventType) {
        switch (message._metroEventType) {
          case 'METRO_INITIALIZE_STARTED': {
            return 'MetroInitializeStarted';
          }
          case 'BUILD_STARTED':
          case 'BUILD_PROGRESS': {
            return 'BuildProgress';
          }
          case 'FINISHED': {
            return 'BuildFinished';
          }
          case 'FAILED': {
            return 'BuildError';
          }
        }
      } else if (message._expoEventType === 'TUNNEL_READY') {
        return 'TunnelReady';
      }
      return 'LogMessage';
    },
  },
  Issue: {
    ...messageResolvers,
    id(issue) {
      return `Issue:${issue.id}`;
    },
    source(issue, args, context) {
      return context.getIssuesSource();
    },
  },
  LogMessage: {
    ...messageResolvers,
    source(message, args, context) {
      return context.getProcessSource();
    },
  },
  MetroInitializeStarted: {
    ...messageResolvers,
    source(message, args, context) {
      return context.getProcessSource();
    },
  },
  BuildProgress: {
    ...messageResolvers,
    source(message, args, context) {
      return context.getProcessSource();
    },
  },
  BuildFinished: {
    ...messageResolvers,
    source(message, args, context) {
      return context.getProcessSource();
    },
  },
  BuildError: {
    ...messageResolvers,
    source(message, args, context) {
      return context.getProcessSource();
    },
  },
  TunnelReady: {
    ...messageResolvers,
    source(message, args, context) {
      return context.getProcessSource();
    },
  },
  DeviceMessage: {
    ...messageResolvers,
    source(message) {
      return { id: message.deviceId, name: message.deviceName };
    },
  },
  MessageSubscriptionPayload: {
    __resolveType(payload) {
      if (payload.type === 'CLEARED') {
        return 'SourceClearedPayload';
      } else {
        return 'MessagePayload';
      }
    },
  },
  SourceClearedPayload: {
    source(payload, args, context) {
      return context.getSourceById(payload.sourceId);
    },
  },
  Project: {
    id(project) {
      return Buffer.from(project.projectDir).toString('base64');
    },
    async manifestUrl(project) {
      if ((await ProjectSettings.getCurrentStatusAsync(project.projectDir)) === 'running') {
        return UrlUtils.constructDeepLinkAsync(project.projectDir);
      } else {
        return null;
      }
    },
    settings(project) {
      return ProjectSettings.readAsync(project.projectDir);
    },
    async config(project) {
      try {
        const { exp } = getConfig(project.projectDir);
        return exp;
      } catch (error) {
        ProjectUtils.logError(project.projectDir, 'expo', error.message);
        return null;
      }
    },
    sources(project, args, context) {
      return context.getSources();
    },
    messages(project, args, context) {
      return context.getMessageConnection();
    },
  },
  ProjectSettings: {
    hostType(projectSettings) {
      if (ConnectionStatus.isOffline() && projectSettings.hostType === 'tunnel') {
        return 'lan';
      } else {
        return projectSettings.hostType;
      }
    },
  },
  Source: {
    __resolveType(source) {
      return source.__typename;
    },
  },
  Issues: {
    messages(source, args, context) {
      return context.getMessageConnection(source);
    },
  },
  Process: {
    messages(source, args, context) {
      return context.getMessageConnection(source);
    },
  },
  Device: {
    messages(source, args, context) {
      return context.getMessageConnection(source);
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
      if (!layout.sources) {
        return [];
      } else {
        return layout.sources
          .map(sourceId => sources.find(source => source.id === sourceId))
          .filter(source => source);
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
    async processInfo(parent, args, context) {
      return {
        isAndroidSimulatorSupported: Android.isPlatformSupported(),
        isIosSimulatorSupported: Simulator.isPlatformSupported(),
      };
    },
    async user() {
      const username = await UserManager.getCurrentUsernameAsync();
      return { username };
    },
  },
  Mutation: {
    async openWeb(parent, props, context) {
      const currentProject = context.getCurrentProject();
      try {
        await Webpack.openAsync(currentProject.projectDir);

        return {
          success: true,
          error: null,
        };
      } catch (error) {
        return {
          success: false,
          error: error.toString(),
        };
      }
    },
    async openSimulator(parent, { platform }, context) {
      const currentProject = context.getCurrentProject();
      let result;
      if (platform === 'ANDROID') {
        result = await Android.openProjectAsync({
          projectRoot: currentProject.projectDir,
          shouldPrompt: false,
        });
      } else {
        result = await Simulator.openProjectAsync({
          projectRoot: currentProject.projectDir,
          shouldPrompt: false,
        });
      }
      if (result.success) {
        return result;
      } else {
        return {
          success: false,
          error: result.error.toString(),
        };
      }
    },
    async publishProject(parent, { releaseChannel }, context) {
      const { projectDir } = context.getCurrentProject();
      try {
        const result = await Project.publishAsync(projectDir, { releaseChannel });
        return result;
      } catch (error) {
        ProjectUtils.logError(projectDir, 'expo', error.message);
        throw error;
      }
    },
    async setProjectSettings(parent, { settings }, context) {
      const currentProject = context.getCurrentProject();
      const previousSettings = await ProjectSettings.readAsync(currentProject.projectDir);
      const updatedSettings = await ProjectSettings.setAsync(currentProject.projectDir, settings);

      // If 'tunnel' wasn't previously configured and it will be as a result of this request, start tunnels.
      if (previousSettings.hostType !== 'tunnel' && updatedSettings.hostType === 'tunnel') {
        try {
          await Project.startTunnelsAsync(currentProject.projectDir, { autoInstall: true });
        } catch (e) {
          ProjectUtils.logWarning(
            currentProject.projectDir,
            'expo',
            `Error starting tunnel ${e.message}`
          );
        }
      }

      return {
        ...currentProject,
        settings: updatedSettings,
      };
    },
    async optimizeAssets(parent, { settings }, context) {
      const currentProject = context.getCurrentProject();

      await spawnAsync('npx', ['expo-optimize'], {
        cwd: currentProject.projectDir,
      });
      return {
        ...currentProject,
      };
    },
    async setProjectConfig(parent, { input }, context) {
      const currentProject = context.getCurrentProject();
      const filteredInput = {
        ...input,
        githubUrl: input.githubUrl.match(/^https:\/\/github.com\//) ? input.githubUrl : undefined,
      };
      const { exp } = await writeConfigJsonAsync(currentProject.projectDir, filteredInput);
      return {
        ...currentProject,
        config: exp,
      };
    },
    async sendProjectUrl(parent, { recipient }, context) {
      const currentProject = context.getCurrentProject();
      const url = await UrlUtils.constructManifestUrlAsync(currentProject.projectDir);
      const result = await Exp.sendAsync(recipient, url);
      await UserSettings.setAsync('sendTo', recipient);
      return { medium: result.medium, url }; // medium can be a phone number or email
    },
    setProjectManagerLayout(parent, { input }, context) {
      context.setProjectManagerLayout(input);
      return context.getProjectManagerLayout();
    },
    updateLastRead(parent, { sourceId, lastReadCursor }, context) {
      const source = context.getSourceById(sourceId);
      if (source) {
        context.setLastRead(sourceId, lastReadCursor);
        return source;
      } else {
        return null;
      }
    },
    clearMessages(parent, { sourceId }, context) {
      const source = context.getSourceById(sourceId);
      context.clearMessages(source.id);
      return source;
    },
  },
  Subscription: {
    messages: {
      subscribe(parent, { after }, context) {
        let parsedCursor: number | null = null;
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

          return() {
            return iterator.return();
          },

          throw(error) {
            return iterator.throw(error);
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
