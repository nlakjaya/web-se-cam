import { Logger } from "../../util/logger";
import { Google } from "../google";

const logger = new Logger("GoogleDrive");
export class GoogleDrive {
  constructor(private google: typeof Google) {
    logger.debug("instance created");
  }

  async upload(filename: string, blob: Blob, ...parents: string[]) {
    logger.debug("upload called:", filename, blob, ...parents);
    const form = new FormData();
    form.append(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            name: filename,
            mimeType: blob.type,
            parents: parents,
          }),
        ],
        {
          type: "application/json",
        },
      ),
    );
    form.append("file", blob);

    const token = await this.google.getToken();
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
  }
}
