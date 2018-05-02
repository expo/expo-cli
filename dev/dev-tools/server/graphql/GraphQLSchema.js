/* @flow */

import { makeExecutableSchema } from 'graphql-tools';
import {
  Android,
  Exp,
  Simulator,
  ProjectSettings,
  ProjectUtils,
  UrlUtils,
  UserSettings,
} from 'xdl';

const typeDefs = /* GraphQL */ `
  enum Platform { android, ios }
  enum HostType { lan, localhost, tunnel }
  type Project {
    projectDir: String!
    # The URL where the Expo manifest is being served.
    manifestUrl: String
    # Settings specific to this project, e.g. URL settings.
    settings: ProjectSettings!
    # Project configuration from app.json.
    config: ProjectConfig

    # All log events for the project
    logs: LogRecordConnection!
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
  enum SendMedium { email, sms }
  type SendProjectResult {
    medium: SendMedium!
    url: String!
  }
  type OpenProjectResult {
    url: String!
  }

  enum LogTag { DEVICE, EXPO, METRO }

  type LogRecord {
    tag: LogTag!
    msg: String!
    time: String!
    level: Int!
    deviceId: String
    deviceName: String
  }

  type PageInfo {
    lastCursor: String
    hasNextPage: Boolean!
  }

  type LogRecordConnection {
    count: Int!
    nodes: [LogRecord!]
    pageInfo: PageInfo
  }

  enum LogRecordSubscriptionPayloadType { ADDED }

  interface LogRecordSubscriptionPayload {
    type: LogRecordSubscriptionPayloadType!
  }

  type LogRecordAdded implements LogRecordSubscriptionPayload {
    type: LogRecordSubscriptionPayloadType!
    node: LogRecord!
  }

  type Query {
    # The project this instance of the XDL server is serving.
    currentProject: Project!
    # Globally persisted user preferences.
    userSettings: UserSettings!
  }
  type Mutation {
    # Opens the app in an iOS simulator or and Android device/emulator.
    openSimulator(platform: Platform!): OpenProjectResult
    # Sends the project URL by email or SMS.
    sendProjectUrl(recipient: String!): SendProjectResult
    # Updates specified project settings.
    setProjectSettings(settings: ProjectSettingsInput!): Project
  }

  type Subscription {
    # TODO: per-project log
    projectLogs(after: String): LogRecordSubscriptionPayload
  }
`;

const resolvers = {
  LogTag: {
    DEVICE: 'device',
    EXPO: 'expo',
    METRO: 'metro',
  },
  LogRecordSubscriptionPayload: {
    __resolveType(parent) {
      if (parent.type === 'ADDED') {
        return 'LogRecordAdded';
      }
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
    logs(project) {
      return [];
    },
  },
  ProjectSettings: {
    hostType(projectSettings) {
      return projectSettings.hostType;
    },
  },
  Query: {
    userSettings() {
      return UserSettings.readAsync();
    },
  },
  Mutation: {
    async openSimulator({ currentProject }, { platform }) {
      let result =
        platform === 'android'
          ? await Android.openProjectAsync(currentProject.projectDir)
          : await Simulator.openProjectAsync(currentProject.projectDir);
      if (!result.success) throw new Error(result.error);
      else return { url: result.url };
    },
    async setProjectSettings({ currentProject }, { settings }) {
      let updatedSettings = await ProjectSettings.setAsync(currentProject.projectDir, settings);
      return {
        ...currentProject,
        settings: updatedSettings,
      };
    },
    async sendProjectUrl({ currentProject }, { recipient }) {
      let url = await UrlUtils.constructManifestUrlAsync(currentProject.projectDir);
      let result = await Exp.sendAsync(recipient, url);
      await UserSettings.setAsync('sendTo', recipient);
      return { medium: result.medium, url };
    },
  },
  Subscription: {
    projectLogs: {
      subscribe() {},
    },
  },
};

export default makeExecutableSchema({ typeDefs, resolvers });
