import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache, defaultDataIdFromObject } from 'apollo-cache-inmemory';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocketLink } from 'apollo-link-ws';
import fetch from 'isomorphic-fetch';
import getConfig from 'next/config';

export default function createApolloClient(initialState) {
  return new ApolloClient({
    link: new WebSocketLink(
      new SubscriptionClient(`ws://${window.location.host}/graphql`, {
        reconnect: true,
      })
    ),
    cache: new InMemoryCache({ dataIdFromObject }),
  });
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
