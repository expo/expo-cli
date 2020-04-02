import { ApolloClient } from 'apollo-client';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { WebSocketLink } from 'apollo-link-ws';

import introspectionQueryResultData from '../../fragmentTypes.json';

export default function createApolloClient(subscriptionClient) {
  const fragmentMatcher = new IntrospectionFragmentMatcher({
    introspectionQueryResultData,
  });
  return new ApolloClient({
    link: new WebSocketLink(subscriptionClient),
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
