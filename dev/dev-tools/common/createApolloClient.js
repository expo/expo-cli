import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache, defaultDataIdFromObject } from 'apollo-cache-inmemory';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocketLink } from 'apollo-link-ws';
import fetch from 'isomorphic-fetch';
import getConfig from 'next/config';

// TODO: remove
let GRAPHQL_HTTP_URL = 'http://localhost:19000/graphql';

export default function createApolloClient(initialState) {
  const { publicRuntimeConfig } = getConfig();

  if (process.browser) {
    return new ApolloClient({
      link: new WebSocketLink(
        new SubscriptionClient(publicRuntimeConfig.graphqlWebSocketURL, {
          reconnect: true,
        })
      ),
      cache: new InMemoryCache({ dataIdFromObject }).restore(initialState),
    });
  } else {
    return new ApolloClient({
      ssrMode: true,
      // TODO(ville): Use apollo-link-schema on the server
      link: new HttpLink({
        uri: GRAPHQL_HTTP_URL,
        fetch,
      }),
      cache: new InMemoryCache({ dataIdFromObject }),
    });
  }
}

function dataIdFromObject(object) {
  switch (object.__typename) {
    case 'Project': {
      if (object.projectDir) {
        return `Project:${object.projectDir}`;
      }
      break;
    }
    case 'UserSettings':
      return 'UserSettings';
    case 'ProjectManagerLayout':
      return 'ProjectManagerLayout';
    case 'Issues':
    case 'Process':
    case 'Device': {
      if (object.id) {
        return `Source:${object.id}`;
      }
      break;
    }
    case 'LogMessage':
    case 'DeviceMessage':
    case 'BuildProgress':
    case 'BuildFinished':
    case 'BuildError': {
      if (object.id) {
        return `Message:${object.id}`;
      }
      break;
    }
    default:
      return defaultDataIdFromObject(object);
  }
}
