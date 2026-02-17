export const LoggerConfig = {
  level: "INFO",
  subscribers: [console.log],
};

const LOGGER = {
  error: (service, ...messages) => {
    LoggerConfig.subscribers.forEach((subscriber) =>
      subscriber("ERROR", service, ...messages),
    );
  },
  warn: (_service, ..._messages) => {},
  info: (_service, ..._messages) => {},
  debug: (_service, ..._messages) => {},
  count: (_service, _label) => {},
  time: (_service, _label) => {},
  timeEnd: (_service, _label) => {},
};

export function LoggerConfigReload() {
  LOGGER.warn = (_service, ..._messages) => {};
  LOGGER.info = (_service, ..._messages) => {};
  LOGGER.debug = (_service, ..._messages) => {};
  LOGGER.count = (_service, ..._messages) => {};
  LOGGER.time = (_service, ..._messages) => {};
  LOGGER.timeEnd = (_service, ..._messages) => {};
  switch (LoggerConfig.level) {
    case "DEBUG":
      LOGGER.debug = (service, ...messages) => {
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
    case "INFO":
      LOGGER.info = (service, ...messages) => {
        LoggerConfig.subscribers.forEach((subscriber) =>
          subscriber(" INFO:", service, ...messages),
        );
      };
    case "WARN":
      LOGGER.warn = (service, ...messages) => {
        LoggerConfig.subscribers.forEach((subscriber) =>
          subscriber(" WARN:", service, ...messages),
        );
      };
    case "ERROR":
      break;
    default:
      throw new Error(`unknown LOG_LEVEL: ${LoggerConfig.level}`);
  }
}

LoggerConfigReload();

export class Logger {
  service;

  constructor(service) {
    this.service = service;
  }

  error(...messages) {
    LOGGER.error(this.service, ...messages);
  }

  warn(...messages) {
    LOGGER.warn(this.service, ...messages);
  }

  info(...messages) {
    LOGGER.info(this.service, ...messages);
  }

  debug(...messages) {
    LOGGER.debug(this.service, ...messages);
  }

  count(label) {
    LOGGER.count(this.service, label);
  }

  time(label) {
    LOGGER.time(this.service, label);
  }

  timeEnd(label) {
    LOGGER.timeEnd(this.service, label);
  }
}
