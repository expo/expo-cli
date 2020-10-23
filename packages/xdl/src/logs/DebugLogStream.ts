import bunyan from '@expo/bunyan';

type DebugLogger = (record: any) => any[] | null;

export class DebugLogStream {
  private loggers: DebugLogger[];
  private enabled: RegExp[] = [];

  constructor(tags?: string, loggers?: DebugLogger[]) {
    this.loggers = loggers || [this.logHttp, this.logSpawn, this.logMessage];
    if (tags) {
      this.enable(tags);
    }
  }

  enable(tags: string) {
    if (tags.trim() === '*') {
      this.enabled = [new RegExp('.*')];
    } else {
      this.enabled = tags
        .split(/[\s,]+/)
        .map(tag => tag.trim().replace(/\*/g, '.*?'))
        .filter(Boolean)
        .map(tag => new RegExp(`^${tag}`));
    }
    return this;
  }

  isEnabled(tag: string) {
    return !!(this.enabled.length && this.enabled.find(item => item.test(tag)));
  }

  write(record: any) {
    if (record.tag && record.type === 'debug' && this.isEnabled(record.tag)) {
      for (const logger of this.loggers) {
        const output = logger(record);
        if (output) {
          return this.log(record, output);
        }
      }
    }
  }

  log(record: any, output: any[] = []) {
    const format = output.shift();
    const message = [`[%s] ${format}`, record.tag, ...output];

    if (record.level < bunyan.INFO) {
      console.log(...message);
    } else if (record.level < bunyan.WARN) {
      console.info(...message);
    } else if (record.level < bunyan.ERROR) {
      console.warn(...message);
    } else {
      console.error(...message);
    }
  }

  /**
   * Log the result of a http request or response.
   * It requires either req or res, with the request and/or response (options).
   */
  logHttp: DebugLogger = record => {
    if (!record.req && !record.res) {
      return null;
    }
    const req = record.res.request || record.req;
    const status = record.res?.status || record.res?.statusCode;
    const url = req.url || `${req.protocol}//${req.host}${req.path}`;
    return ['%s %s -> %s', req.method?.toUpperCase() || '?', url, status || '?'];
  };

  /**
   * Log the result of spawning a command with optional args.
   * It requires a spawn object with command, args and optional results.
   */
  logSpawn: DebugLogger = record => {
    if (!record.spawn) {
      return null;
    }
    return [
      '%s %s -> %i',
      record.spawn.command,
      record.spawn.args?.join(' '),
      record.spawn.result?.status,
    ];
  };

  /**
   * Log a simple message as string, as fallback logger.
   * It requires a msg, added by bunyan.
   */
  logMessage: DebugLogger = record => {
    return !record.msg ? null : ['%s', record.msg];
  };
}
