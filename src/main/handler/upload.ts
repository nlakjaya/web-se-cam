import { Request, Response } from "express";
import * as fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import Google from "../service/google";

const UPLOAD_PATH = process.env.UPLOAD_PATH || "./data/upload";
const UPLOAD_STORAGE_QUOTA = process.env.UPLOAD_STORAGE_QUOTA
  ? Number.parseInt(process.env.UPLOAD_STORAGE_QUOTA)
  : 512 * 1024 * 1024; // Default is 512MB
const UPLOAD_MAX_FILE_SIZE = process.env.UPLOAD_MAX_FILE_SIZE
  ? Number.parseInt(process.env.UPLOAD_MAX_FILE_SIZE)
  : 32 * 1024 * 1024; // default is 32MB
const UPLOAD_TIMEOUT = process.env.UPLOAD_TIMEOUT
  ? Number.parseInt(process.env.UPLOAD_TIMEOUT)
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
    for (const fileStat of fileStats) {
      if (freedSpace >= neededSpace) break;
      try {
        await fs.promises.unlink(fileStat.path);
        freedSpace += fileStat.size;
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

async function fileUploadHandler(
  req: Request,
  res: Response,
  validatedHeaders: { fileName: string; contentLength: number },
) {
  const uploadStartTime = Date.now();
  const sanitizedFilename = sanitizeFilename(validatedHeaders.fileName);
  const filePath = path.join(UPLOAD_PATH, sanitizedFilename);
  if (fs.existsSync(filePath)) {
    console.error(
      "Bad request: file already exists:",
      filePath,
      `(original file name: "${validatedHeaders.fileName}")`,
    );
    return res.status(409).json({
      error: `Conflict: "${validatedHeaders.fileName}" already exists`,
    });
  }

  await fs.promises.mkdir(UPLOAD_PATH, { recursive: true });
  const currentStorageUsed = await getStorageUsed(UPLOAD_PATH);
  const projectedStorage = currentStorageUsed + validatedHeaders.contentLength;
  const spaceNeeded = projectedStorage - UPLOAD_STORAGE_QUOTA;
  if (spaceNeeded > 0) {
    const freedSpace = await freeStorageSpace(UPLOAD_PATH, spaceNeeded);
    if (
      currentStorageUsed - freedSpace + validatedHeaders.contentLength >
      UPLOAD_STORAGE_QUOTA
    ) {
      console.error("Server error: insufficient storage on upload:", filePath);
      return res.status(507).json({ error: "Insufficient storage" });
    }
  }

  const writeStream = fs.createWriteStream(filePath);
  const handleError = (
    statusCode: number,
    errorResponse: any,
    ...errorLog: any[]
  ) => {
    console.error(...errorLog);
    writeStream.destroy();
    fs.promises.unlink(filePath).catch((error) => {
      console.error("failed to unlink:", filePath, error);
    });
    res.status(statusCode).json(errorResponse);
  };
  writeStream.on("finish", async () => {
    const uploadDuration = Date.now() - uploadStartTime;
    console.log(
      `Upload completed: ${sanitizedFilename} (${validatedHeaders.contentLength} bytes in ${uploadDuration}ms)`,
    );
    res.status(201).json({
      success: true,
    });
  });
  writeStream.on("error", (error) =>
    handleError(
      500,
      { error: "Internal Server Error" },
      "Server error:",
      error,
    ),
  );

  req.pipe(writeStream);
  req.on("error", (error) =>
    handleError(
      500,
      { error: "Internal Server Error" },
      "Server error:",
      error,
    ),
  );
  req.setTimeout(UPLOAD_TIMEOUT, () =>
    handleError(
      408,
      { error: "Request timeout" },
      "Bad request: timeout on upload:",
      filePath,
    ),
  );
}

async function googleDriveUploadHandler(
  req: Request,
  res: Response,
  validatedHeaders: {
    fileName: string;
    contentLength: number;
    contentType: string;
  },
) {
  const uploadStartTime = Date.now();
  const sanitizedFilename = sanitizeFilename(validatedHeaders.fileName);

  try {
    const stream = new PassThrough();
    req.pipe(stream);

    let id: string | undefined;
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      id = await Google.Drive.upload(
        sanitizedFilename,
        validatedHeaders.contentType,
        stream,
        process.env.GOOGLE_DRIVE_FOLDER_ID,
      );
    } else {
      id = await Google.Drive.upload(
        sanitizedFilename,
        validatedHeaders.contentType,
        stream,
      );
    }

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(
      `Upload completed: Google Drive: ${id} (${validatedHeaders.contentLength} bytes in ${uploadDuration}ms)`,
    );
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Google Drive upload error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}

function validateRequest(
  req: Request,
  res: Response,
):
  | {
      fileName: string;
      contentLength: number;
      contentType: string;
    }
  | undefined {
  const contentLength = req.headers["content-length"]
    ? Number.parseInt(req.headers["content-length"])
    : undefined;
  const contentType = req.headers["content-type"];
  const fileName = req.headers["x-filename"];

  if (!(contentLength && contentType && fileName)) {
    console.error("Bad request: missing/invalid required headers:", {
      contentLength,
      contentType,
      fileName,
    });
    res.status(400).json({ error: "Missing required headers" });
    return;
  }
  if (contentLength > UPLOAD_MAX_FILE_SIZE) {
    console.error(
      "Bad request: too large content length:",
      contentLength,
      "for file:",
      fileName,
    );
    res.status(413).json({ error: "File too large" });
    return;
  }
  if (!(contentType.includes("video/") || contentType.includes("audio/"))) {
    console.error(
      "Bad request: invalid content type:",
      contentType,
      "for file:",
      fileName,
    );
    res.status(415).json({ error: "Only video/audio allowed" });
    return;
  }
  if (Array.isArray(fileName)) {
    console.error("Bad request: multiple files:", fileName);
    res.status(415).json({ error: "Only one file is allowed" });
    return;
  }
  return {
    contentLength,
    contentType,
    fileName,
  };
}

export function getHandlerUpload() {
  let handler: (req: Request, res: Response) => Promise<void>;
  if (process.env.GOOGLE_APIS_REFRESH_TOKEN) {
    console.log(
      `Uploads will be saved in Google Drive: ${process.env.GOOGLE_DRIVE_FOLDER_ID ?? "root"}`,
    );
    handler = async (req: Request, res: Response) => {
      const validatedHeaders = validateRequest(req, res);
      if (!validatedHeaders) return;
      if (await googleDriveUploadHandler(req, res, validatedHeaders)) return;
      fileUploadHandler(req, res, validatedHeaders);
    };
  } else {
    console.log(`Uploads will be saved in local: ${UPLOAD_PATH}`);
    handler = async (req: Request, res: Response) => {
      const validatedHeaders = validateRequest(req, res);
      if (!validatedHeaders) return;
      fileUploadHandler(req, res, validatedHeaders);
    };
  }
  console.log(
    `Storage quota: ${Math.round(UPLOAD_STORAGE_QUOTA / 1024 / 1024)} MB`,
  );
  console.log(
    `Max file size: ${Math.round(UPLOAD_MAX_FILE_SIZE / 1024 / 1024)} MB`,
  );
  console.log(`Upload timeout: ${Math.round(UPLOAD_TIMEOUT / 1000)} s`);
  return handler;
}
