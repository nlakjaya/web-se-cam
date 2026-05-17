export const LoggerConfig = {
  level: "DEBUG",
  subscribers: [] as ((...messages: string[]) => void)[],
};

const LOGGER = {
  error: (service: string, ...messages: any[]) => {
    console.error(service, ...messages);
    LoggerConfig.subscribers.forEach((subscriber) =>
      subscriber("ERROR", service, ...messages),
    );
  },
  warn: (_service: string, ..._messages: any[]) => {},
  info: (_service: string, ..._messages: any[]) => {},
  debug: (_service: string, ..._messages: any[]) => {},
  count: (_service: string, _label: string) => {},
  time: (_service: string, _label: string) => {},
  timeEnd: (_service: string, _label: string) => {},
};

export function LoggerConfigReload() {
  LOGGER.warn = (_service: string, ..._messages: any[]) => {};
  LOGGER.info = (_service: string, ..._messages: any[]) => {};
  LOGGER.debug = (_service: string, ..._messages: any[]) => {};
  LOGGER.count = (_service: string, ..._messages: any[]) => {};
  LOGGER.time = (_service: string, ..._messages: any[]) => {};
  LOGGER.timeEnd = (_service: string, ..._messages: any[]) => {};
  switch (LoggerConfig.level) {
    case "DEBUG":
      LOGGER.debug = (service, ...messages) => {
        console.debug(service, ...messages);
        LoggerConfig.subscribers.forEach((subscriber) =>
          subscriber("DEBUG:", service, ...messages),
        );
      };
      LOGGER.count = (service, label) => {
        console.count(["COUNT", service, label].join(" "));
      };
      LOGGER.time = (service, label) => {
        console.time([" PERF", service, label].join(" "));
      };
      LOGGER.timeEnd = (service, label) => {
        console.timeEnd([" PERF", service, label].join(" "));
      };
    // fall through
    case "INFO":
      LOGGER.info = (service, ...messages) => {
        console.info(service, ...messages);
        LoggerConfig.subscribers.forEach((subscriber) =>
          subscriber(" INFO:", service, ...messages),
        );
      };
    // fall through
    case "WARN":
      LOGGER.warn = (service, ...messages) => {
        console.warn(service, ...messages);
        LoggerConfig.subscribers.forEach((subscriber) =>
          subscriber(" WARN:", service, ...messages),
        );
      };
    // fall through
    case "ERROR":
      break;
    default:
      throw new Error(`unknown LOG_LEVEL: ${LoggerConfig.level}`);
  }
}

LoggerConfigReload();

export class Logger {
  service: string;

  constructor(service: string) {
    this.service = service;
  }

  error(...messages: any[]) {
    LOGGER.error(this.service, ...messages);
  }

  warn(...messages: any[]) {
    LOGGER.warn(this.service, ...messages);
  }

  info(...messages: any[]) {
    LOGGER.info(this.service, ...messages);
  }

  debug(...messages: any[]) {
    LOGGER.debug(this.service, ...messages);
  }

  count(label: string) {
    LOGGER.count(this.service, label);
  }

  time(label: string) {
    LOGGER.time(this.service, label);
  }

  timeEnd(label: string) {
    LOGGER.timeEnd(this.service, label);
  }
}
