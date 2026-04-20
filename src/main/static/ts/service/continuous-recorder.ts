import { Logger } from "../util/logger";
import { MediaRecorder } from "./media-recorder";

type Options = {
  interval: number;
  rolloverMinimumThresholdMs: number;
  fileNaming: string;
  fileNamingRolloverNewTs: boolean;
  sequenceNoPadding?: number;
  onSave?: (filename: string, blob: Blob) => void;
};

export const defaultOptions: Options = {
  interval: 60000,
  fileNamingRolloverNewTs: true,
  rolloverMinimumThresholdMs: 2000,
  fileNaming: "%YYYY%MM%DD_%hh%mm%ss-cr%n",
  sequenceNoPadding: 3,
};

const logger = new Logger("ContinuousRecorder");
export class ContinuousRecorder {
  private options: Options;
  private mediaRecorder?: MediaRecorder;
  private currentFilename?: string;
  private timeoutId?: any;

  constructor() {
    this.options = defaultOptions;

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }

  start(mediaRecorder: MediaRecorder, fileNameExt = "webm") {
    logger.debug("start called:", mediaRecorder);

    if (this.mediaRecorder) {
      throw new Error("Continuous recording already started");
    }

    let sequenceNo = 1;
    const now = new Date();
    const rollover = () => {
      logger.debug("rollover called");

      if (this.mediaRecorder) {
        const currentFilename = this.currentFilename as string;
        this.mediaRecorder.rollover().then((blob) => {
          this.options.onSave?.(currentFilename, blob);
        });
      }

      const filenameDate = this.options.fileNamingRolloverNewTs
        ? new Date()
        : now;
      this.currentFilename = `${this.options.fileNaming
        .replaceAll(
          "%n",
          String(sequenceNo).padStart(this.options.sequenceNoPadding ?? 0, "0"),
        )
        .replaceAll("%YYYY", String(filenameDate.getFullYear()))
        .replaceAll("%MM", String(filenameDate.getMonth() + 1).padStart(2, "0"))
        .replaceAll("%DD", String(filenameDate.getDate()).padStart(2, "0"))
        .replaceAll("%hh", String(filenameDate.getHours()).padStart(2, "0"))
        .replaceAll("%mm", String(filenameDate.getMinutes()).padStart(2, "0"))
        .replaceAll(
          "%ss",
          String(filenameDate.getSeconds()).padStart(2, "0"),
        )}.${fileNameExt}`;
      sequenceNo++;

      let nextRollover =
        this.options.interval - (Date.now() % this.options.interval);
      if (nextRollover < this.options.rolloverMinimumThresholdMs) {
        nextRollover += this.options.interval;
      }
      this.timeoutId = setTimeout(() => rollover(), nextRollover) as any;
      logger.debug("rollover scheduled in ms:", nextRollover);
    };

    rollover();
    mediaRecorder.start();
    this.mediaRecorder = mediaRecorder;
  }

  stop() {
    logger.debug("stop called");

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
      logger.debug("rollover schedule cancelled");
      if (this.mediaRecorder) {
        const currentFilename = this.currentFilename as string;
        this.mediaRecorder.stop().then((blob) => {
          this.options.onSave?.(currentFilename, blob);
        });
        this.mediaRecorder = undefined;
      }
    }
  }
}
