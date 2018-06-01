import uniqBy from 'lodash/uniqBy';
import { $$asyncIterator } from 'iterall';
import eventEmitterToAsyncIterator from '../asynciterators/eventEmitterToAsyncIterator';

const ISSUES_SOURCE = {
  __typename: 'Issues',
  id: 'Source:issues',
  name: 'Issues',
};
const PROCESS_SOURCE = {
  __typename: 'Process',
  id: 'Source:metro',
  name: 'Metro Bundler',
};
const DEFAULT_SOURCES = [ISSUES_SOURCE, PROCESS_SOURCE];

export default function createContext({ projectDir, messageBuffer, layout, issues }) {
  let flattenedMessages;
  return {
    getCurrentProject() {
      return {
        projectDir,
      };
    },
    getMessageIterator(cursor) {
      return messageBuffer.getIterator(cursor);
    },
    getMessageEdges(source) {
      if (!flattenedMessages) {
        flattenedMessages = flattenMessagesFromBuffer(messageBuffer);
      }

      let items;
      if (source) {
        let filter;
        switch (source.__typename) {
          case 'Issues': {
            items = issues.getIssueList();
            break;
          }
          case 'Process': {
            filter = message =>
              message.tag === 'metro' || message.tag === 'expo' || message.type === 'global';
            break;
          }
          case 'Device': {
            filter = message => message.tag === 'device' && message.deviceId === source.id;
            break;
          }
        }
        if (filter) {
          items = flattenedMessages.filter(({ item: { node } }) => filter(node));
        }
      }

      if (!items) {
        items = [...flattenedMessages];
      }

      return items.map(({ item }) => item);
    },
    getMessageConnection(source) {
      const edges = this.getMessageEdges(source);

      let unreadCount = 0;
      let lastReadCursor = null;
      if (source) {
        ({ unreadCount, lastReadCursor } = extractReadInfo(layout.get(), source.id, edges));
      }

      return {
        count: edges.length,
        unreadCount,
        edges,
        // on-demand mapping
        nodes: () => edges.map(({ node }) => node),
        pageInfo: {
          hasNextPage: false,
          lastReadCursor,
          lastCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },
    getIssuesSource() {
      return ISSUES_SOURCE;
    },
    getProcessSource() {
      return PROCESS_SOURCE;
    },
    getSourceById(id) {
      const allSources = this.getSources();
      return allSources.find(source => source.id === id);
    },
    getSources() {
      const chunks = messageBuffer.all().filter(({ node }) => node.tag === 'device');
      const devices = uniqBy(chunks, ({ node }) => node.deviceId).map(({ node }) => ({
        __typename: 'Device',
        id: node.deviceId,
        name: node.deviceName,
      }));
      return DEFAULT_SOURCES.concat(devices);
    },
    getProjectManagerLayout() {
      return layout.get();
    },
    setProjectManagerLayout(newLayout) {
      newLayout.sources.forEach(sourceId => {
        this.setLastRead(sourceId);
      });
      layout.set(newLayout);
    },
    setLastRead(sourceId, lastReadCursor) {
      if (!lastReadCursor) {
        const source = this.getSourceById(sourceId);
        const edges = this.getMessageEdges(source);
        if (edges.length === 0) {
          return;
        } else {
          lastReadCursor = edges[edges.length - 1].cursor;
        }
      }
      layout.setLastRead(sourceId, lastReadCursor.toString());
    },
    getIssueIterator() {
      const iterator = eventEmitterToAsyncIterator(issues, ['ADDED', 'UPDATED', 'DELETED']);
      return {
        async next() {
          const { value, done } = await iterator.next();
          return {
            value: {
              type: value.eventName,
              node: value.event,
            },
            done,
          };
        },

        [$$asyncIterator]() {
          return this;
        },
      };
    },
  };
}

function flattenMessagesFromBuffer(buffer) {
  const items = buffer.allWithCursor();
  const itemsById = new Map();
  const flattenedItems = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const element = {
      item: {
        cursor: item.cursor,
        node: item.item.node,
      },
    };
    const id = element.item.node.id;
    if (!itemsById.has(id)) {
      itemsById.set(id, element);
      flattenedItems.unshift(element);
    } else {
      itemsById.get(id).item.cursor = item.cursor;
    }
  }
  return flattenedItems;
}

function extractReadInfo(layout, sourceId, items) {
  let lastReadCursor = layout.sourceLastReads[sourceId];
  let unreadCount;
  if (!lastReadCursor) {
    lastReadCursor = items[0] && items[0].cursor;
    unreadCount = items.length;
  } else {
    const index = items.findIndex(({ cursor }) => cursor.toString() === lastReadCursor);
    unreadCount = items.length - index - 1;
  }
  return {
    lastReadCursor,
    unreadCount,
  };
}
