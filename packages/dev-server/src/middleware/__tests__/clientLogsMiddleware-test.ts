import bunyan from '@expo/bunyan';
import bodyParser from 'body-parser';
import connect from 'connect';
import http from 'http';
import fetch from 'node-fetch';

import clientLogsMiddleware from '../clientLogsMiddleware';

const headers = {
  'content-type': 'application/json',
  'device-id': '11111111-CAFE-0000-0000-111111111111',
  'session-id': '22222222-C0DE-0000-0000-222222222222',
  'device-name': 'iPhone',
};

it('logs messages from the device', async () => {
  const { server, url, logStream } = await createServerAsync();
  try {
    const response = await fetch(`${url}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          count: 1,
          level: 'info',
          body: ['Hello world!'],
          includesStack: false,
          groupDepth: 0,
        },
        {
          count: 2,
          level: 'error',
          body: [
            {
              message: 'Something went wrong...',
              stack: 'App.js:3:12 in <global>',
            },
          ],
          includesStack: true,
          groupDepth: 0,
        },
        {
          // We want this to be filtered out.
          count: 3,
          level: 'info',
          body: [
            'BugReporting extraData:',
            'Object {\n' +
              '  "AppRegistry.runApplication1": "Running \\"main\\" with yada yada yada",\n' +
              '}',
          ],
          includesStack: false,
          groupDepth: 0,
        },
      ]),
    });
    expect(response.ok).toBe(true);
    expect(logStream.output).toMatchSnapshot();
  } finally {
    server.close();
  }
});

class TestLogStream {
  output: string[] = [];

  write(record: any) {
    const message = record.includesStack ? JSON.parse(record.msg).message : record.msg;
    const deviceName = record.deviceName ?? '';
    if (record.level < bunyan.INFO) {
      this.output.push(`${deviceName}: [debug] ${message}`);
    } else if (record.level < bunyan.WARN) {
      this.output.push(`${deviceName}: [info] ${message}`);
    } else if (record.level < bunyan.ERROR) {
      this.output.push(`${deviceName}: [warn] ${message}`);
    } else {
      this.output.push(`${deviceName}: [error] ${message}`);
    }
  }
}

async function createServerAsync() {
  const logStream = new TestLogStream();
  const logger = bunyan.createLogger({
    name: 'expo-test',
    streams: [
      {
        type: 'raw',
        stream: logStream,
        level: 'info',
      },
    ],
  });
  const app = connect().use(bodyParser.json()).use(clientLogsMiddleware(logger));

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) =>
    server.listen((error: any) => {
      if (error) reject(error);
      else resolve();
    })
  );

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server has no port');

  return {
    server,
    url: `http://localhost:${address.port}`,
    logStream,
  };
}
