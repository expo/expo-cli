import uniqBy from 'lodash/uniqBy';
import { $$asyncIterator } from 'iterall';
import eventEmitterToAsyncIterator from '../asynciterators/eventEmitterToAsyncIterator';

export const ISSUES_SOURCE = {
  __typename: 'Issues',
  id: 'Source:issues',
  name: 'Issues',
};
export const PROCESS_SOURCE = {
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
      if (source) {
        if (source.id === ISSUES_SOURCE.id) {
          return issues.getIssueList();
        }
        return flattenMessagesFromBuffer(messageBuffer, source.id);
      } else {
        return flattenMessagesFromBuffer(messageBuffer);
      }
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
      const chunks = messageBuffer.all().filter(({ node }) => node && node.tag === 'device');
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
    clearMessages(sourceId) {
      messageBuffer.push({
        type: 'CLEARED',
        sourceId,
      });
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
  };
}

function flattenMessagesFromBuffer(buffer, sourceId) {
  const items = buffer.allWithCursor();
  const itemsById = new Map();
  const flattenedItems = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const { cursor, item } = items[i];
    if (sourceId && item.sourceId !== sourceId) {
      continue;
    }
    if (item.type === 'CLEARED') {
      break;
    }
    const { node } = item;
    if (!itemsById.has(node.id)) {
      const element = { cursor, node };
      itemsById.set(node.id, element);
      flattenedItems.unshift(element);
    } else {
      itemsById.get(node.id).cursor = cursor;
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
