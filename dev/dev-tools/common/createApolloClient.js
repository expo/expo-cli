import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocketLink } from 'apollo-link-ws';
import fetch from 'isomorphic-fetch';
import getConfig from 'next/config';

import introspectionQueryResultData from '../fragmentTypes.json';

export default function createApolloClient(initialState) {
  const fragmentMatcher = new IntrospectionFragmentMatcher({
    introspectionQueryResultData,
  });
  return new ApolloClient({
    link: new WebSocketLink(
      new SubscriptionClient(`ws://${window.location.host}/graphql`, {
        reconnect: true,
      })
    ),
    cache: new InMemoryCache({ dataIdFromObject, fragmentMatcher }),
  });
}

function dataIdFromObject(object) {
  // If the object has a field named `id`, it must be a globally unique ID.
  if (object.id !== undefined) {
    return object.id;
  }
  return null;
}
