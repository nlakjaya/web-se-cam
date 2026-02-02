import { Logger } from "../util/logger";
import { MediaRecorder } from "./media-recorder";

type Options = {
  interval: number;
  fileNaming: string;
  sequenceNoPadding?: number;
  onSave?: (filename: string, blob: Blob) => {};
};

const logger = new Logger("ContinuousRecorder");
export class ContinuousRecorder {
  private options: Options;
  private mediaRecorder?: MediaRecorder;
  private currentFilename?: string;
  private timeoutId?: any;

  constructor() {
    this.options = {
      interval: 60000,
      fileNaming: "%YYYY%MM%DD%hh%mm%ss-cr%n",
      sequenceNoPadding: 5,
    };

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
    const rollover = async () => {
      logger.debug("rollover called");

      if (this.mediaRecorder) {
        const blob = await this.mediaRecorder.rollover();
        if (this.options.onSave) {
          this.options.onSave(this.currentFilename as string, blob);
        }
      }

      const now = new Date();
      this.currentFilename = `${this.options.fileNaming
        .replaceAll(
          "%n",
          String(sequenceNo).padStart(this.options.sequenceNoPadding ?? 0, "0"),
        )
        .replaceAll("%YYYY", String(now.getFullYear()))
        .replaceAll("%MM", String(now.getMonth()).padStart(2, "0"))
        .replaceAll("%DD", String(now.getDate()).padStart(2, "0"))
        .replaceAll("%hh", String(now.getHours()).padStart(2, "0"))
        .replaceAll("%mm", String(now.getMinutes()).padStart(2, "0"))
        .replaceAll(
          "%ss",
          String(now.getSeconds()).padStart(2, "0"),
        )}.${fileNameExt}`;
      sequenceNo++;

      const nextRollover =
        this.options.interval - (Date.now() % this.options.interval);
      this.timeoutId = setTimeout(() => rollover(), nextRollover) as any;
      logger.debug("rollover scheduled in ms:", nextRollover);
    };

    rollover();
    mediaRecorder.start();
    this.mediaRecorder = mediaRecorder;
  }

  async stop() {
    logger.debug("stop called");

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      if (this.mediaRecorder) {
        const blob = await this.mediaRecorder.stop();
        if (this.options.onSave) {
          this.options.onSave(this.currentFilename as string, blob);
        }
      }
      this.mediaRecorder = undefined;
    }
  }
}
