class Analytics {
  identify = jest.fn();
  group = jest.fn();
  track = jest.fn();
  page = jest.fn();
  alias = jest.fn();
  flush = jest.fn();
  enqueue = jest.fn();
}

module.exports = Analytics;
