import { drive_v3, google } from "googleapis";
import Stream from "node:stream";
import { GoogleClass } from "./types";

export class Drive {
  constructor(private readonly google: GoogleClass) {}

  private async getDrive(): Promise<drive_v3.Drive> {
    const auth = await this.google.getAuthorization();
    return google.drive({ version: "v3", auth });
  }

  async upload(
    name: string,
    mimeType: string,
    body: Stream.Readable | Buffer,
    ...parentFolderIds: string[]
  ): Promise<string | undefined> {
    const drive = await this.getDrive();
    try {
      const response = await drive.files.create({
        requestBody: {
          name,
          parents: parentFolderIds,
        },
        media: {
          mimeType,
          body,
        },
        fields: "id",
      });
      return response.data.id ?? undefined;
    } catch (error) {
      console.error("Google Drive:", "Upload Error:", error);
      throw error;
    }
  }

  async download(fileId: string): Promise<Stream.Readable> {
    const drive = await this.getDrive();
    try {
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" },
      );
      return response.data;
    } catch (error) {
      console.error("Google Drive:", "Download Error:", error);
      throw error;
    }
  }

  async list(
    q: string = "trashed = false",
    pageSize: number = 10,
  ): Promise<drive_v3.Schema$File[]> {
    const drive = await this.getDrive();
    try {
      const response = await drive.files.list({
        q,
        pageSize,
        fields: "files(id, name, mimeType, size)",
      });

      return response.data.files || [];
    } catch (error) {
      console.error("Google Drive:", "List Error:", error);
      throw error;
    }
  }

  async delete(fileId: string, skipTrash: boolean = false): Promise<void> {
    const drive = await this.getDrive();
    try {
      if (skipTrash) {
        await drive.files.delete({ fileId });
      } else {
        await drive.files.update({ fileId, requestBody: { trashed: true } });
      }
    } catch (error) {
      console.error("Google Drive:", "Delete Error:", error);
      throw error;
    }
  }
}
