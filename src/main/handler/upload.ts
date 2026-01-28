import { Request, Response } from "express";
import * as fs from "fs";
import path from "path";

const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE
  ? parseInt(process.env.MAX_FILE_SIZE)
  : 32 * 1024 * 1024; // default is 32MB
const UPLOAD_TIMEOUT = process.env.UPLOAD_TIMEOUT
  ? parseInt(process.env.UPLOAD_TIMEOUT)
  : 60 * 1000; // default is 60s

function sanitizeFilename(filename: string): string {
  return path
    .basename(filename)
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Replace special characters with underscore
    .substring(0, 255); // Limit length
}

async function getStorageUsed(uploadPath: string): Promise<number> {
  try {
    const files = await fs.promises.readdir(uploadPath);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(uploadPath, file);
      const stats = await fs.promises.stat(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  } catch (error) {
    console.error("Error calculating storage used:", error);
    return 0;
  }
}

async function freeStorageSpace(
  uploadPath: string,
  neededSpace: number,
): Promise<number> {
  try {
    const files = await fs.promises.readdir(uploadPath);
    const fileStats = [];

    for (const file of files) {
      const filePath = path.join(uploadPath, file);
      const stats = await fs.promises.stat(filePath);
      fileStats.push({
        name: file,
        path: filePath,
        mtime: stats.mtime.getTime(),
        size: stats.size,
      });
    }
    fileStats.sort((a, b) => a.mtime - b.mtime);

    let freedSpace = 0;
    const deletedFiles = [];
    for (const fileStat of fileStats) {
      if (freedSpace >= neededSpace) break;
      try {
        await fs.promises.unlink(fileStat.path);
        freedSpace += fileStat.size;
        deletedFiles.push(fileStat.name);
        console.log(
          `Freed ${fileStat.size} bytes by deleting ${fileStat.name}`,
        );
      } catch (error) {
        console.error(`Failed to delete ${fileStat.name}:`, error);
      }
    }

    return freedSpace;
  } catch (error) {
    console.error("Error freeing storage space:", error);
    return 0;
  }
}

export function getHandlerUpload(uploadPath: string, storageQuota: number) {
  console.log(`Uploads will be saved in: ${uploadPath}`);
  console.log(`Storage quota: ${Math.round(storageQuota / 1024 / 1024)} MB`);
  console.log(`Max file size: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB`);
  console.log(`Upload timeout: ${Math.round(UPLOAD_TIMEOUT / 1000)} s`);
  return async (req: Request, res: Response) => {
    const contentLength = parseInt(
      req.headers["content-length"]?.toString() ||
        req.headers["Content-Length"]?.toString() ||
        "0",
    );
    const contentType =
      req.headers["content-type"] || req.headers["Content-Type"];
    const fileName =
      req.headers["x-filename"]?.toString() ||
      req.headers["X-Filename"]?.toString();
    if (!(contentLength > 0 && contentType && fileName)) {
      res.status(400).json({
        error: "Bad Request",
        message:
          "One or more required headers missing: Content-Length, Content-Type and X-Filename",
      });
      return;
    }
    if (contentLength > MAX_FILE_SIZE) {
      res.status(411).json({
        error: "Length Exceeded",
        message: `Max Length is ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      });
      return;
    }
    if (!(contentType.includes("video/") || contentType.includes("audio/"))) {
      res.status(415).json({
        error: "Media Type Rejected",
        message: "Only Video/Audio are accepted",
      });
      return;
    }

    const sanitizedFilename = sanitizeFilename(fileName);
    const partFilePath = path.join(uploadPath, `${sanitizedFilename}.part`);
    const finalFilePath = path.join(uploadPath, sanitizedFilename);
    if (fs.existsSync(finalFilePath)) {
      res.status(409).json({
        error: "Conflict",
        message: `File "${fileName}" already exists`,
      });
      return;
    }

    await fs.promises.mkdir(uploadPath, { recursive: true });
    const currentStorageUsed = await getStorageUsed(uploadPath);
    const projectedStorage = currentStorageUsed + contentLength;
    const spaceNeeded = projectedStorage - storageQuota;
    if (spaceNeeded > 0) {
      const freedSpace = await freeStorageSpace(uploadPath, spaceNeeded);
      if (currentStorageUsed - freedSpace + contentLength > storageQuota) {
        res.status(507).json({
          error: "Insufficient Storage",
          message: `Storage quota exceeded. Need ${spaceNeeded} more bytes`,
        });
        return;
      }
    }

    const writeStream = fs.createWriteStream(partFilePath);
    let receivedBytes = 0;
    let uploadStartTime = Date.now();

    req.on("data", (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > contentLength) {
        writeStream.end();
        fs.promises.unlink(partFilePath);
        req.destroy();
        res.status(413).json({
          error: "Payload Too Large",
          message: `Received ${receivedBytes} bytes, expected ${contentLength}`,
        });
      } else {
        writeStream.write(chunk);
      }
    });

    async function handleError(message: string, error: any) {
      console.error(`${message}:`, error);

      try {
        await fs.promises.unlink(partFilePath);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }

      res.status(500).json({
        error: "Internal Server Error",
        message,
      });
    }

    req.on("end", async () => {
      writeStream.on("close", async () => {
        try {
          const stats = await fs.promises.stat(partFilePath);
          if (stats.size !== contentLength) {
            await fs.promises.unlink(partFilePath);
            res.status(422).json({
              error: "Unprocessable Entity",
              message: `File size mismatch: expected ${contentLength}, got ${stats.size}`,
            });
            return;
          }

          await fs.promises.rename(partFilePath, finalFilePath);

          const uploadTime = Date.now() - uploadStartTime;
          console.log(
            `Upload completed: ${sanitizedFilename} (${stats.size} bytes in ${uploadTime}ms)`,
          );

          res.status(201).json({
            success: true,
            filename: sanitizedFilename,
            size: stats.size,
            uploadTimeMs: uploadTime,
          });
        } catch (error) {
          handleError("Failed to finalize upload", error);
        }
      });

      writeStream.end();
    });

    req.on("error", (error) => handleError("Upload failed", error));
    writeStream.on("error", (error) =>
      handleError("Failed to write file", error),
    );

    req.setTimeout(UPLOAD_TIMEOUT, () => {
      writeStream.end();
      fs.promises.unlink(partFilePath);
      res.status(408).json({
        error: "Request Timeout",
        message: "Upload took too long",
      });
    });
  };
}
