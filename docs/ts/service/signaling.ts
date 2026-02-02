import { Logger } from "../util/logger";

type Options<T> = {
  onOpen?: (clientId: string) => void;
  onMessage: (message: T, from: string, clientId: string) => void;
  onClose?: (clientId: string) => void;
};

const logger = new Logger("Signaling");
export class Signaling<R, T> {
  private ws: WebSocket;
  private options: Options<R>;

  constructor(clientId: string, options: Options<R>) {
    this.ws = new WebSocket(`/subscribe?id=${encodeURI(clientId)}`);
    this.options = options;

    this.ws.onclose = (event) => {
      logger.debug("(native).onclose called:", event);
      this.options.onClose?.(clientId);
    };
    this.ws.onopen = async (event) => {
      logger.debug("(native).onopen called:", event);
      this.options.onOpen?.(clientId);
    };
    this.ws.onmessage = (event) => {
      logger.debug("(native).onmessage called:", event);
      const { data, from } = JSON.parse(event.data);
      options.onMessage(data, from, clientId);
    };

    logger.debug("instance created");
  }

  send(recipientId: string, message: T) {
    this.ws.send(JSON.stringify({ recipientId, data: message }));
  }

  close() {
    this.ws.close();
  }

  updateOptions(options: Partial<Options<R>>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }
}
