import express, { NextFunction, Request, Response } from "express";
import expressWs from "express-ws";
import path from "path";
import { getHandlerUpload } from "./handler/upload";
import { getHandlerSubscribe } from "./handler/signaling";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const STATIC_FILES = "./static";

const UPLOAD_PATH = process.env.UPLOAD_PATH || "./upload";
const STORAGE_QUOTA = process.env.STORAGE_QUOTA
  ? parseInt(process.env.STORAGE_QUOTA)
  : 512 * 1024 * 1024; // Default is 512MB

const MAX_CLIENTS_COUNT = process.env.MAX_CLIENTS_COUNT
  ? parseInt(process.env.MAX_CLIENTS_COUNT)
  : 16;

const app = expressWs(express()).app;

app.use(express.json());

app.use(express.static(path.join(__dirname, STATIC_FILES)));
console.log(`Static files served from: ${STATIC_FILES}`);

app.post("/upload", getHandlerUpload(UPLOAD_PATH, STORAGE_QUOTA));
app.ws("/subscribe", getHandlerSubscribe(MAX_CLIENTS_COUNT));

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
