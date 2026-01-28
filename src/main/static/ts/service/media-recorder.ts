import { ALL_BIT_RATES, ALL_FORMATS } from "../util/constants";
import { Logger } from "../util/logger";

type Options = {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
};

type Handler = {
  nativeRecorder: MediaRecorder;
  resolve?: (blob: Blob) => void;
  blobs: Blob[];
};

const logger = new Logger("MediaRecorder");
class MediaRecorderWrapper {
  private options: Options;
  private mixedStream: MediaStream;
  private timeSlice?: number;
  private preRollIntervalId?: any;
  private handlers: Handler[];

  constructor(options: Options, ...tracks: MediaStreamTrack[]) {
    this.options = options;
    this.mixedStream = new MediaStream();
    this.handlers = [];

    tracks.forEach((track) => this.mixedStream.addTrack(track));

    logger.debug("instance created");
  }

  getState(): "pre-rolling" | RecordingState {
    return this.preRollIntervalId
      ? "pre-rolling"
      : (this.handlers[0]?.nativeRecorder.state ?? "inactive");
  }

  start(timeSlice?: number, preRoll: number = 0) {
    logger.debug(
      "start called:",
      "timeSlice:",
      timeSlice,
      "pre-roll:",
      preRoll,
    );

    const preRollIntervalFunction = () => {
      if (this.handlers.length > 1) {
        const handler = this.handlers[0];
        this.handlers.push(handler);
        this.handlers.shift();
        handler.nativeRecorder.stop();
        handler.nativeRecorder.start();
      } else {
        const handler: Handler = {
          nativeRecorder: new MediaRecorder(this.mixedStream, {
            mimeType: this.options?.mimeType,
            audioBitsPerSecond: this.options?.audioBitsPerSecond,
            videoBitsPerSecond: this.options.videoBitsPerSecond,
          }),
          blobs: [],
        };
        handler.nativeRecorder.ondataavailable = (event) => {
          logger.debug("(native).ondataavailable called:", event);
          if (event.data.size > 0) {
            handler.blobs.push(event.data);
          }
        };
        handler.nativeRecorder.onstop = (event) => {
          logger.debug("(native).onstop called:", event);
          if (handler.resolve) {
            const blob = new Blob(handler.blobs, {
              type: handler.nativeRecorder.mimeType,
            });
            handler.resolve(blob);
            handler.resolve = undefined;
          } else {
            logger.warn(
              "(native).onstop failed:",
              "handler.resolve:",
              handler.blobs,
            );
          }
          handler.blobs = [];
        };
        handler.nativeRecorder.start(timeSlice);
        this.handlers.push(handler);
      }
    };

    if (this.preRollIntervalId) {
      clearInterval(this.preRollIntervalId);
      while ((preRoll && this.handlers.length) || this.handlers.length > 1) {
        this.handlers.pop()?.nativeRecorder.stop();
      }
    } else {
      preRollIntervalFunction();
    }
    if (preRoll) {
      this.preRollIntervalId = setInterval(
        () => preRollIntervalFunction(),
        preRoll,
      );
    }
  }

  async stop(): Promise<Blob> {
    logger.debug("stop called");

    if (this.preRollIntervalId) {
      clearInterval(this.preRollIntervalId);
      this.preRollIntervalId = undefined;
      while (this.handlers.length > 1) {
        this.handlers.pop()?.nativeRecorder.stop();
      }
    }

    const handler = this.handlers.pop();
    if (handler?.resolve) {
      const prevResolve = handler.resolve;
      await new Promise<void>(
        (resolve) =>
          (handler.resolve = (blob: Blob) => {
            prevResolve(blob);
            logger.debug("prevResolve called:", blob);
            resolve();
          }),
      );
    }
    if (handler?.nativeRecorder.state == "recording") {
      handler.nativeRecorder.stop();
      this.timeSlice = undefined;
      return new Promise((resolve) => (handler.resolve = resolve));
    }
    const error = new Error("Media is not recording");
    logger.error("stop failed:", error);
    throw error;
  }

  async rollover(timeSlice?: number): Promise<Blob> {
    logger.debug("rollover called:", timeSlice);

    const promise = this.stop();
    this.start(timeSlice);
    return promise;
  }

  static getSupportedFormats() {
    logger.debug("static getSupportedFormats called");

    return ALL_FORMATS.filter((format) =>
      MediaRecorder.isTypeSupported(format.mimetype),
    );
  }

  static getSupportedBitRates() {
    logger.debug("static getSupportedBitRates called");

    return ALL_BIT_RATES;
  }
}

export { MediaRecorderWrapper as MediaRecorder };
