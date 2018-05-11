import uniqBy from 'lodash/uniqBy';

const ISSUES_SOURCE = {
  __typename: 'Issues',
  id: 'Source:issues',
  name: 'Critical Issues',
};
const PROCESS_SOURCE = {
  __typename: 'Process',
  id: 'Source:metro',
  name: 'Metro Bundler',
};
const DEFAULT_SOURCES = [ISSUES_SOURCE, PROCESS_SOURCE];

export default function createContext({ projectDir, messageBuffer, layout }) {
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
    getMessageConnection(filter?) {
      if (!flattenedMessages) {
        flattenedMessages = flattenMessagesFromBuffer(messageBuffer);
      }
      let items;
      if (filter) {
        items = flattenedMessages.filter(({ cursor, item }) => filter(item.node));
      } else {
        items = [...flattenedMessages];
      }
      return {
        count: items.length,
        nodes: items.map(({ item }) => item.node),
        pageInfo: {
          hasNextPage: false,
          lastCursor: items.length > 0 ? items[items.length - 1].cursor : null,
        },
      };
    },
    getIssuesSource() {
      return ISSUES_SOURCE;
    },
    getProcessSource() {
      return PROCESS_SOURCE;
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
      layout.set(newLayout);
    },
  };
}

function flattenMessagesFromBuffer(buffer) {
  const items = buffer.allWithCursor();
  const ids = new Set();
  const flattenedItems = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const element = items[i];
    const id = element.item.node.id;
    if (!ids.has(id)) {
      ids.add(id);
      flattenedItems.unshift(element);
    }
  }
  return flattenedItems;
}
