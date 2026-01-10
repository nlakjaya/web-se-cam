import { Logger } from "../util/logger";
import { Storage } from "./storage";

type Options = {
  url: string;
  mode: "blob";
  fallbackStorage?: Storage;
};

const logger = new Logger("Uploader");
export class Uploader {
  private options: Options;

  constructor(url: string) {
    const canvasElement = document.createElement("canvas");

    this.options = { url, mode: "blob" };

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }

  async post(filename: string, blob: Blob) {
    logger.debug("post called:", filename, blob);
    try {
      switch (this.options.mode) {
        case "blob":
          const response = await fetch(this.options.url, {
            method: "POST",
            headers: {
              "Content-Type": blob.type,
              "X-Filename": encodeURIComponent(filename),
            },
            body: blob,
          });
          if (response.status != 201) {
            throw new Error(
              `HTTP POST: ${response.status} ${response.statusText}`,
            );
          }
          logger.info("Upload success:", filename, await response.text());
          break;
        default:
          throw new Error("Unsupported mode:", this.options.mode);
      }
    } catch (error) {
      logger.warn("post failed:", filename, error);
      if (this.options.fallbackStorage) {
        logger.info("Falling back to storage");
        await this.options.fallbackStorage.save(filename, blob);
      }
    }
  }
}
