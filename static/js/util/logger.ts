export const LOGGER = {
  level: "INFO",
  subscribers: [console.log],
  error: (service: string, ...messages: any[]) => {
    LOGGER.subscribers.forEach((subscriber) =>
      subscriber("ERROR", service, ...messages),
    );
  },
  warn: (_service: string, ..._messages: any[]) => {},
  info: (_service: string, ..._messages: any[]) => {},
  debug: (_service: string, ..._messages: any[]) => {},
  count: (_service: string, ..._messages: any[]) => {},
  time: (_service: string, ..._messages: any[]) => {},
  timeEnd: (_service: string, ..._messages: any[]) => {},
  reload: () => {
    LOGGER.warn = (_service: string, ..._messages: any[]) => {};
    LOGGER.info = (_service: string, ..._messages: any[]) => {};
    LOGGER.debug = (_service: string, ..._messages: any[]) => {};
    LOGGER.count = (_service: string, ..._messages: any[]) => {};
    LOGGER.time = (_service: string, ..._messages: any[]) => {};
    LOGGER.timeEnd = (_service: string, ..._messages: any[]) => {};
    switch (LOGGER.level) {
      case "DEBUG":
        LOGGER.debug = (service, ...messages) => {
          LOGGER.subscribers.forEach((subscriber) =>
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
          LOGGER.subscribers.forEach((subscriber) =>
            subscriber(" INFO:", service, ...messages),
          );
        };
      case "WARN":
        LOGGER.warn = (service, ...messages) => {
          LOGGER.subscribers.forEach((subscriber) =>
            subscriber(" WARN:", service, ...messages),
          );
        };
      case "ERROR":
        break;
      default:
        throw new Error(`unknown LOG_LEVEL: ${LOGGER.level}`);
    }
  },
};

LOGGER.reload();

export class Logger {
  service: string;

  constructor(service: string) {
    this.service = service.substring(
      service.lastIndexOf("/", service.lastIndexOf("/") + 1),
      service.length - service.lastIndexOf("."),
    );
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
