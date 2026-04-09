import { Logger } from "../../util/logger";
import { GoogleClient } from "./client";

type Options = {
  gsiClient: GoogleClient;
  parents?: string[];
  fallback?: (filename: string, blob: Blob) => Promise<void>;
};

const logger = new Logger("GoogleDrive");
export class GoogleDrive {
  private options: Options;

  constructor(gsiClient: GoogleClient) {
    this.options = { gsiClient };

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }

  async upload(filename: string, blob: Blob) {
    logger.debug("upload called:", filename, blob);
    const form = new FormData();
    form.append(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            name: filename,
            mimeType: blob.type,
            parents: this.options.parents ?? [],
          }),
        ],
        {
          type: "application/json",
        },
      ),
    );
    form.append("file", blob);
    try {
      const token = await this.options.gsiClient.getToken();
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.bearer}`,
          },
          body: form,
        },
      );
      if (response.status != 200) {
        throw new Error(`HTTP POST: ${response.status} ${response.statusText}`);
      }
      logger.debug("upload success:", filename, await response.json());
    } catch (error) {
      if (this.options.fallback) {
        logger.warn("upload failed:", filename, "falling back...");
        await this.options.fallback(filename, blob);
      } else {
        logger.warn("upload failed:", filename, error);
      }
    }
  }
}
